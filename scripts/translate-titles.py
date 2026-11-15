"""Offline CPU inference. Only public titles are read; no inference API is called."""
import json
import os
import re
import torch
from transformers import MarianMTModel, MarianTokenizer

MODEL = "Helsinki-NLP/opus-mt-en-zh"
torch.set_num_threads(2)
rows = json.load(open(".data/title-input.json", encoding="utf-8"))
tokenizer = MarianTokenizer.from_pretrained(MODEL)
model = MarianMTModel.from_pretrained(MODEL).eval()
output = []
for row in rows:
    title = row["title_original"]
    if re.search(r"[\u3400-\u9fff]", title):
        continue  # Chinese/Japanese mixed titles need language-specific review.
    inputs = tokenizer(title, return_tensors="pt", truncation=False)
    if inputs["input_ids"].shape[1] > 450:
        continue  # Never silently truncate a regulatory title.
    with torch.inference_mode():
        tokens = model.generate(**inputs, max_new_tokens=512, num_beams=4)
    translated = tokenizer.decode(tokens[0], skip_special_tokens=True)
    if re.search(r"[\u3400-\u9fff]", translated):
        output.append({**row, "translation": translated})
json.dump(output, open(".data/title-output.json", "w", encoding="utf-8"), ensure_ascii=False)
print(json.dumps({"model": MODEL, "translated": len(output), "pending_review": len(rows)-len(output)}))
