"""Read-only evidence collection. Never writes database fields or infers legal status."""
import concurrent.futures
import hashlib
import io
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from pypdf import PdfReader

HOSTS = {
    'www.fda.gov', 'fda.gov', 'www.ema.europa.eu', 'ema.europa.eu',
    'www.pmda.go.jp', 'database.ich.org', 'www.ich.org',
    'www.usp.org', 'faq.edqm.eu', 'www.edqm.eu',
    'english.nmpa.gov.cn', 'www.nmpa.gov.cn', 'www.cde.org.cn',
    'www.ydcdei.org.cn',
}
CACHE = Path('.data/official-field-evidence')
CACHE.mkdir(parents=True, exist_ok=True)
locks = {host: threading.Lock() for host in HOSTS}
last_requests = {}
rate_limited_hosts = set()

def validate(url):
    u = urllib.parse.urlsplit(url)
    if u.scheme != 'https' or u.hostname not in HOSTS or u.username or u.password or u.port:
        raise ValueError('not_allowed_official_url')
    return url

class OfficialRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1
        if tag in ('p', 'div', 'li', 'h1', 'h2', 'h3', 'tr', 'br'):
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, text):
        if not self.hidden:
            self.parts.append(text)

def collect(url):
    key = hashlib.sha256(url.encode()).hexdigest()
    target = CACHE / (key + '.json')
    if target.exists():
        cached = json.loads(target.read_text(encoding='utf-8'))
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(cached['checked_at'])).total_seconds()
        ttl = 7 * 86400 if cached.get('outcome') == 'captured_for_review' else 6 * 3600
        if 0 <= age < ttl:
            return cached
    result = {'url': url, 'checked_at': datetime.now(timezone.utc).isoformat()}
    try:
        validate(url)
        host = urllib.parse.urlsplit(url).hostname
        with locks[host]:
            if host in rate_limited_hosts:
                raise ValueError('deferred_after_host_HTTP_429')
            time.sleep(max(0, 1.2 - (time.monotonic() - last_requests.get(host, 0))))
            last_requests[host] = time.monotonic()
            req = urllib.request.Request(url, headers={'User-Agent': 'BioRegRadar/1.0 public official document metadata verification'})
            with urllib.request.build_opener(OfficialRedirect()).open(req, timeout=20) as response:
                validate(response.url)
                if response.status != 200:
                    raise ValueError('HTTP_' + str(response.status))
                data = response.read(20_000_001)
                if len(data) > 20_000_000:
                    raise ValueError('document_exceeds_20MB')
                content_type = response.headers.get_content_type()
                result['resolved_url'] = response.url
                result['content_sha256'] = hashlib.sha256(data).hexdigest()
                if data.startswith(b'%PDF-'):
                    pdf = PdfReader(io.BytesIO(data))
                    # A blank user password is a publicly readable PDF, not a paywall.
                    if pdf.is_encrypted and not pdf.decrypt(''):
                        raise ValueError('encrypted_pdf_not_accessed')
                    page_count = len(pdf.pages)
                    # Bounded metadata inspection, explicitly not a full-text capture.
                    indexes = sorted(set(range(min(15, page_count))) | set(range(max(0, page_count-2), page_count)))
                    pages = [{'page': i+1, 'text': pdf.pages[i].extract_text() or ''} for i in indexes]
                    text = '\n'.join(p['text'] for p in pages)
                    result.update(kind='pdf', total_pages=page_count, inspected_pages=pages)
                elif content_type in ('text/html', 'application/xhtml+xml'):
                    html = data.decode(response.headers.get_content_charset() or 'utf-8', errors='replace')
                    if re.search(r'<title[^>]*>\s*(Access denied|Just a moment|Request rejected)', html, re.I):
                        raise ValueError('access_verification_page')
                    parser = VisibleText()
                    parser.feed(html)
                    text = '\n'.join(re.sub(r'\s+', ' ', p).strip() for p in ''.join(parser.parts).splitlines())
                    result['kind'] = 'html'
                else:
                    raise ValueError('unsupported_content_type')
                if len(text.strip()) < 40:
                    raise ValueError('insufficient_extractable_text')
                result.update(outcome='captured_for_review', text=text)
    except urllib.error.HTTPError as error:
        if error.code == 429:
            rate_limited_hosts.add(urllib.parse.urlsplit(url).hostname)
        result.update(outcome='restricted', reason='HTTP_' + str(error.code))
    except Exception as error:
        # Never serialize request objects, credentials, or arbitrary exception strings.
        reason = str(error) if isinstance(error, ValueError) else type(error).__name__
        result.update(outcome='unavailable', reason=reason)
    target.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    return result

def main():
    rows = json.loads(Path(os.environ.get('OFFICIAL_AUDIT_INPUT', '.data/enrichment-baseline.json')).read_text(encoding='utf-8'))
    urls = sorted({u for row in rows for u in [row.get('official_url'), row.get('pdf_url'), *(row.get('attachment_urls') or [])] if u})
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        for result in executor.map(collect, urls):
            results[result['url']] = result
            if len(results) % 20 == 0:
                print(json.dumps({'urls_checked': len(results), 'total': len(urls)}), flush=True)
    audit = []
    for row in rows:
        checked = [results[u] for u in dict.fromkeys([row.get('official_url'), row.get('pdf_url'), *(row.get('attachment_urls') or [])]) if u]
        audit.append({'id': row['id'], 'regulator': row['regulator'], 'title_original': row['title_original'],
                      'evidence': [{k: v for k, v in item.items() if k not in ('text', 'inspected_pages')} for item in checked],
                      'review_status': 'requires_document_specific_field_review'})
    Path('.data/official-fields-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'records_audited': len(audit), 'urls': len(results), 'captured': sum(r['outcome'] == 'captured_for_review' for r in results.values()), 'database_writes': 0}))

if __name__ == '__main__':
    main()
