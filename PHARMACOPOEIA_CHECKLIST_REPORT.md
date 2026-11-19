# USP / EP 关注清单收录核对

状态：生产补录、重复同步和字段完整性验收通过；正式部署验收待记录。

核对日期：2026-11-19（北京时间）。

## 核对范围

依据用户提供的《创新生物药与生物类似药_USP_EP关注清单 (1).pdf》，创新生物药和生物类似药两部分合并去重。

- USP：73 个明确章节及 General Notices，共 74 个具体条目。
- EP / EDQM：67 个明确章节／专论及凡例，共 68 个具体条目。
- USP 1000–1999 是章节编号范围；EP 3.1 是材料章节系列，均不作为独立文件入库。
- 附录 FDA 比较分析指南和 EMA 生物药问答分别核对收录。
- 培训幻灯片、机构主页、主题目录和通用检索入口不计为法规文件。

## 官方证据与限制

USP 逐一核对 doi.usp.org 的章节标题与编号，保存公开预览和 DOI。EDQM 逐一核对官方 Knowledge 数据库的 Monograph Number、English Name、发布状态和版本字段。两者均未下载订阅正文，页面保留正文需订阅提示。

“Knowledge In Use”仅表示已发布；药典版次、未来删除计划和生效日期分别保留，不推断当前生效或产品适用性。缺少官方确证的日期保持空值。原有 PDG 协调文件及 FAQ 与章节本身属于不同文件，保留各自记录。

## 既有 ICH 配套文件

|系列|已存在记录数|代表性官方链接|
|---|---:|---|
|Q5A|1|https://database.ich.org/sites/default/files/ICH_Q5A%28R2%29_Guideline_2023_1101.pdf|
|Q5B|1|https://database.ich.org/sites/default/files/Q5B%20Guideline.pdf|
|Q5C|2|https://www.ich.org/page/quality-guidelines|
|Q5D|1|https://database.ich.org/sites/default/files/Q5D%20Guideline.pdf|
|Q5E|2|https://database.ich.org/sites/default/files/Q5E%20Guideline.pdf|
|Q6B|1|https://database.ich.org/sites/default/files/Q6B%20Guideline.pdf|
|Q8|5|https://database.ich.org/sites/default/files/Q8%28R2%29%20Guideline.pdf|
|Q9|6|https://www.ich.org/page/quality-guidelines|
|Q10|5|https://www.ich.org/page/quality-guidelines|
|Q11|2|https://database.ich.org/sites/default/files/Q11%20Guideline.pdf|

## 生产执行结果

- 首轮 Actions：44332325656（2026-11-18 UTC），USP +74、EDQM +68，已有版本更新 0。
- 原有 593 条全部保留；药典补录后 735 条；FDA 附录指南补录后 736 条。
- EDQM 两个原有目录返回 403，继续报告 DEGRADED；142 个清单目标均成功索引，不用其他页面成功掩盖这两项失败。
- 首轮和后续 FDA 任务最终失败原因为 USP 〈791〉pH 没有中文字符，完整性检查通过。没有将失败任务描述为成功。
- 已审阅 143 个本地模型候选译名，修正 67 处术语或表达；保留原题、模型版本、哈希及现有回滚凭据机制。修订为 BioReg Translation，不是官方译名。
- 本地 lint、typecheck、197 项测试、production build、HTTP smoke 通过；CI 44427078526 通过。
- 修复后重复同步 44427437943：workflow success；USP/EDQM 均新增 0、更新 0；736 条法规、755 个版本、717 个变更记录、53 个摘要，Mock 0，中文缺失 0，integrity passed。
- EMA 附录问答同步 44427493023：workflow success；新增 1、更新 0、失败 0；最终 737 条法规、756 个版本、718 个变更记录、53 个摘要，Mock 0，中文缺失 0，integrity passed。译名“生物药产品问题与解答”通过检查。
- 所有 142 个药典目标均恰有一条对应记录；原有 593 条记录全部保留。修订译名未生成法规版本。

|来源|本次新增|最终来源总数|范围|
|---|---:|---:|---|
|USP|74|105|73 个明确章节及凡例；公开预览，正文需订阅|
|EP / EDQM|68|72|67 个章节／专论及凡例；Knowledge 公开元数据|
|FDA|1|136|治疗性蛋白生物类似药比较分析及质量考虑指南|
|EMA|1|112|生物药产品问答|
|合计|144|737（全库）|不宣称药典全量或当前全部生效文本|

## Actions 证据

- [修订 CI 44427078526](https://github.com/jyw833509-glitch/BioReg/actions/runs/44427078526)：success，代码版本 6a3bf3fa4b64a644b2ed9c8b4419898d742d9598。
- [药典初次补录 44332325656](https://github.com/jyw833509-glitch/BioReg/actions/runs/44332325656)：抓取完成，因 pH 中文质量门槛最终 failure。
- [FDA 补录 44333902329](https://github.com/jyw833509-glitch/BioReg/actions/runs/44333902329)：新增指南成功，同一 pH 门槛导致最终 failure。
- [药典重复同步及译名修正 44427437943](https://github.com/jyw833509-glitch/BioReg/actions/runs/44427437943)：success。
- [EMA 补录及最终完整性检查 44427493023](https://github.com/jyw833509-glitch/BioReg/actions/runs/44427493023)：success。
- 原有 regulatory-sync-summary 与 field-enrichment-summary artifacts 均已下载核验。

## 剩余限制

- EDQM technical-guides 与 harmonisation-status-for-general-texts-pdg 两个旧目录仍 HTTP 403；保留 DEGRADED 和实际原因。本次 Knowledge 章节成功不等于这两个目录恢复。
- 订阅正文未获取，未把公开摘要／元数据冒称完整正文。USP 预览中的引用年份不是完整发布日期；DOI 内部编号不是官方版次。
- 清单中的适用品种专论、EP 3.1 材料系列及 USP 1000–1999 范围需结合具体产品继续核对，不能由本次明确列举条目推导全量覆盖。
- 一般培训文件、主题目录、官方主页与检索入口不作为独立法规结果；具体章节与 2 份配套文件已分开收录。

## 两份配套资料

- FDA：[官方指南](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/development-therapeutic-protein-biosimilars-comparative-analytical-assessment-and-other-quality)；[站内记录](https://bioreg-global.netlify.app/regulations/cmwmazs2a00020tp0sgnef5pn)。
- EMA：[官方问答](https://www.ema.europa.eu/en/human-regulatory-overview/research-and-development/scientific-guidelines/biological-guidelines/questions-answers-biological-medicinal-products)；[站内记录](https://bioreg-global.netlify.app/regulations/cmwmu1rzw00022t1qc45jifkf)。

## 发布

无需 schema 迁移；未删除生产数据；沿用现有 GitHub Actions、Supabase、Netlify，无新增工作流或定时任务。正式部署版本及发布后验证将在完成后追加。

## 清单条目（已核实官方页面）

|来源|章节／编号|官方标题|官方页面|
|---|---|---|---|
|USP|51|〈51〉 Antimicrobial Effectiveness Testing|https://doi.usp.org/USPNF/USPNF_M98790_03_01.html|
|USP|61|〈61〉 Microbiological Examination of Nonsterile Products: Microbial Enumeration Tests|https://doi.usp.org/USPNF/USPNF_M98800_02_01.html|
|USP|62|〈62〉 Microbiological Examination of Nonsterile Products: Tests for Specified Microorganisms|https://doi.usp.org/USPNF/USPNF_M98802_02_01.html|
|USP|63|〈63〉 Mycoplasma Tests|https://doi.usp.org/USPNF/USPNF_M3687_01_01.html|
|USP|71|〈71〉 Sterility Tests|https://doi.usp.org/USPNF/USPNF_M98810_01_01.html|
|USP|85|〈85〉 Bacterial Endotoxins Test|https://doi.usp.org/USPNF/USPNF_M98830_02_01.html|
|USP|86|〈86〉 Bacterial Endotoxins Test Using Recombinant Reagents|https://doi.usp.org/USPNF/USPNF_M16015_02_01.html|
|USP|87|〈87〉 Biological Reactivity Tests, In Vitro|https://doi.usp.org/USPNF/USPNF_M98833_02_01.html|
|USP|88|〈88〉 Biological Reactivity Tests, In Vivo|https://doi.usp.org/USPNF/USPNF_M98834_02_01.html|
|USP|129|〈129〉 Analytical Procedures for Recombinant Therapeutic Monoclonal Antibodies|https://doi.usp.org/USPNF/USPNF_M6297_04_01.html|
|USP|212|〈212〉 Oligosaccharide Analysis|https://doi.usp.org/USPNF/USPNF_M5879_04_01.html|
|USP|232|〈232〉 Elemental Impurities—Limits|https://doi.usp.org/USPNF/USPNF_M5192_03_01.html|
|USP|233|〈233〉 Elemental Impurities—Procedures|https://doi.usp.org/USPNF/USPNF_M5193_03_01.html|
|USP|381|〈381〉 Elastomeric Components in Injectable Pharmaceutical Product Packaging/Delivery Systems|https://doi.usp.org/USPNF/USPNF_M99140_10_01.html|
|USP|382|〈382〉 Elastomeric Component Functional Suitability in Parenteral Product Packaging/Delivery Systems|https://doi.usp.org/USPNF/USPNF_M11355_06_01.html|
|USP|467|〈467〉 Residual Solvents|https://doi.usp.org/USPNF/USPNF_M99226_09_01.html|
|USP|507|〈507〉 Protein Determination Procedures|https://doi.usp.org/USPNF/USPNF_M7147_04_01.html|
|USP|509|〈509〉 Residual DNA Testing|https://doi.usp.org/USPNF/USPNF_M7146_02_01.html|
|USP|621|〈621〉 Chromatography|https://doi.usp.org/USPNF/USPNF_M99380_10_01.html|
|USP|643|〈643〉 Total Organic Carbon|https://doi.usp.org/USPNF/USPNF_M99403_05_01.html|
|USP|645|〈645〉 Water Conductivity|https://doi.usp.org/USPNF/USPNF_M99405_01_01.html|
|USP|660|〈660〉 Containers—Glass|https://doi.usp.org/USPNF/USPNF_M1757_02_01.html|
|USP|665|〈665〉 Plastic Components and Systems Used to Manufacture Pharmaceutical Drug Products and Biopharmaceutical Drug Substances and Products|https://doi.usp.org/USPNF/USPNF_M11135_03_01.html|
|USP|785|〈785〉 Osmolality and Osmolarity|https://doi.usp.org/USPNF/USPNF_M99580_04_01.html|
|USP|787|〈787〉 Subvisible Particulate Matter in Therapeutic Protein Injections|https://doi.usp.org/USPNF/USPNF_M6497_02_01.html|
|USP|788|〈788〉 Particulate Matter in Injections|https://doi.usp.org/USPNF/USPNF_M99586_04_01.html|
|USP|790|〈790〉 Visible Particulates in Injections|https://doi.usp.org/USPNF/USPNF_M7197_01_01.html|
|USP|791|〈791〉 pH|https://doi.usp.org/USPNF/USPNF_M99590_03_01.html|
|USP|921|〈921〉 Water Determination|https://doi.usp.org/USPNF/USPNF_M99710_05_01.html|
|USP|1032|〈1032〉 Design and Development of Biological Assays|https://doi.usp.org/USPNF/USPNF_M1354_02_01.html|
|USP|1033|〈1033〉 Biological Assay Validation|https://doi.usp.org/USPNF/USPNF_M912_02_01.html|
|USP|1034|〈1034〉 Analysis of Biological Assays|https://doi.usp.org/USPNF/USPNF_M5677_03_01.html|
|USP|1050|〈1050〉 Viral Safety Evaluation of Biotechnology Products Derived from Cell Lines of Human or Animal Origin|https://doi.usp.org/USPNF/USPNF_M99774_03_01.html|
|USP|1051|〈1051〉 Cleaning Glass Apparatus|https://doi.usp.org/USPNF/USPNF_M99776_04_01.html|
|USP|1052|〈1052〉 Biotechnology-Derived Articles—Amino Acid Analysis|https://doi.usp.org/USPNF/USPNF_M858_03_01.html|
|USP|1053|〈1053〉 Capillary Electrophoresis|https://doi.usp.org/USPNF/USPNF_M859_04_01.html|
|USP|1054|〈1054〉 Biotechnology-Derived Articles—Isoelectric Focusing|https://doi.usp.org/USPNF/USPNF_M860_03_01.html|
|USP|1055|〈1055〉 Biotechnology-Derived Articles—Peptide Mapping|https://doi.usp.org/USPNF/USPNF_M861_02_01.html|
|USP|1056|〈1056〉 Biotechnology-Derived Articles—Polyacrylamide Gel Electrophoresis|https://doi.usp.org/USPNF/USPNF_M862_01_01.html|
|USP|1057|〈1057〉 Biotechnology-Derived Articles—Total Protein Assay|https://doi.usp.org/USPNF/USPNF_M863_02_01.html|
|USP|1058|〈1058〉 Analytical Instrument Qualification|https://doi.usp.org/USPNF/USPNF_M1124_01_01.html|
|USP|1084|〈1084〉 Glycoprotein and Glycan Analysis—General Considerations|https://doi.usp.org/USPNF/USPNF_M916_01_01.html|
|USP|1111|〈1111〉 Microbiological Examination of Nonsterile Products: Acceptance Criteria for Pharmaceutical Preparations and Substances for Pharmaceutical Use|https://doi.usp.org/USPNF/USPNF_M99830_01_01.html|
|USP|1116|〈1116〉 Microbiological Control and Monitoring of Aseptic Processing Environments|https://doi.usp.org/USPNF/USPNF_M99835_01_01.html|
|USP|1119|〈1119〉 Bioburden Monitoring|https://doi.usp.org/USPNF/USPNF_M18255_02_01.html|
|USP|1130|〈1130〉 Nucleic Acid-Based Techniques—Approaches for Detecting Trace Nucleic Acids (Residual DNA Testing)|https://doi.usp.org/USPNF/USPNF_M2744_01_01.html|
|USP|1132|〈1132〉 Residual Host Cell Protein Measurement in Biopharmaceuticals|https://doi.usp.org/USPNF/USPNF_M8647_01_01.html|
|USP|1207|〈1207〉 Package Integrity Evaluation—Sterile Products|https://doi.usp.org/USPNF/USPNF_M99926_01_01.html|
|USP|1211|〈1211〉 Sterility Assurance|https://doi.usp.org/USPNF/USPNF_M99930_05_01.html|
|USP|1220|〈1220〉 Analytical Procedure Life Cycle|https://doi.usp.org/USPNF/USPNF_M10975_02_01.html|
|USP|1223|〈1223〉 Validation of Alternative Microbiological Methods|https://doi.usp.org/USPNF/USPNF_M99943_04_01.html|
|USP|1224|〈1224〉 Transfer of Analytical Procedures|https://doi.usp.org/USPNF/USPNF_M5511_04_01.html|
|USP|1225|〈1225〉 Validation of Compendial Procedures|https://doi.usp.org/USPNF/USPNF_M99945_04_01.html|
|USP|1226|〈1226〉 Verification of Compendial Procedures|https://doi.usp.org/USPNF/USPNF_M870_03_01.html|
|USP|1227|〈1227〉 Validation of Microbial Recovery from Pharmacopeial Articles|https://doi.usp.org/USPNF/USPNF_M99947_03_01.html|
|USP|1228|〈1228〉 Depyrogenation|https://doi.usp.org/USPNF/USPNF_M8097_03_01.html|
|USP|1229|〈1229〉 Sterilization of Compendial Articles|https://doi.usp.org/USPNF/USPNF_M7408_03_01.html|
|USP|1231|〈1231〉 Water for Pharmaceutical Purposes|https://doi.usp.org/USPNF/USPNF_M99956_08_01.html|
|USP|1237|〈1237〉 Virology Test Methods|https://doi.usp.org/USPNF/USPNF_M915_01_01.html|
|USP|1663|〈1663〉 Assessment of Extractables Associated with Pharmaceutical Packaging/Delivery Systems|https://doi.usp.org/USPNF/USPNF_M7126_03_01.html|
|USP|1664|〈1664〉 Assessment of Drug Product Leachables Associated with Pharmaceutical Packaging/Delivery Systems|https://doi.usp.org/USPNF/USPNF_M7127_04_01.html|
|USP|1665|〈1665〉 Characterization and Qualification of Plastic Components and Systems Used to Manufacture Pharmaceutical Drug Products and Biopharmaceutical Drug Substances and Products|https://doi.usp.org/USPNF/USPNF_M11136_02_01.html|
|USP|1787|〈1787〉 Measurement of Subvisible Particulate Matter in Therapeutic Protein Injections|https://doi.usp.org/USPNF/USPNF_M7866_04_01.html|
|USP|1788|〈1788〉 Methods for the Determination of Subvisible Particulate Matter|https://doi.usp.org/USPNF/USPNF_M3023_03_01.html|
|USP|1790|〈1790〉 Visual Inspection of Injections|https://doi.usp.org/USPNF/USPNF_M7198_07_01.html|
|USP|1050.1|〈1050.1〉 Design, Evaluation, and Characterization of Viral Clearance Procedures|https://doi.usp.org/USPNF/USPNF_M7187_01_01.html|
|USP|1788.3|〈1788.3〉 Flow Imaging Method for the Determination of Subvisible Particulate Matter|https://doi.usp.org/USPNF/USPNF_M12537_02_01.html|
|USP|1119.1|〈1119.1〉 Bioburden Test|https://doi.usp.org/USPNF/USPNF_M18395_02_01.html|
|USP|1132.1|〈1132.1〉 Residual Host Cell Protein Measurement in Biopharmaceuticals by Liquid Chromatography-Mass Spectrometry|https://doi.usp.org/USPNF/USPNF_M17756_02_01.html|
|USP|661.1|〈661.1〉 Plastic Materials of Construction|https://doi.usp.org/USPNF/USPNF_M8008_14_01.html|
|USP|661.2|〈661.2〉 Plastic Packaging Systems for Pharmaceutical Use|https://doi.usp.org/USPNF/USPNF_M8009_06_01.html|
|USP|1229.18|〈1229.18〉 Viral Clearance Methods|https://doi.usp.org/USPNF/USPNF_M13516_02_01.html|
|USP|1229.4|〈1229.4〉 Sterilizing Filtration of Liquids|https://doi.usp.org/USPNF/USPNF_M7413_03_01.html|
|EDQM|2.2.1|Clarity and degree of opalescence of liquids (2.2.1.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20201|
|EDQM|2.2.2|Degree of coloration of liquids (2.2.2.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20202|
|EDQM|2.2.25|Absorption spectrophotometry, ultraviolet and visible (2.2.25.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20225|
|EDQM|2.2.29|Liquid chromatography (2.2.29.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20229|
|EDQM|2.2.3|Potentiometric determination of pH (2.2.3.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20203|
|EDQM|2.2.30|Size-exclusion chromatography (2.2.30.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20230|
|EDQM|2.2.31|Electrophoresis (2.2.31.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20231|
|EDQM|2.2.35|Osmolality (2.2.35.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20235|
|EDQM|2.2.41|Circular dichroism (2.2.41.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20241|
|EDQM|2.2.43|Mass spectrometry (2.2.43.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20243|
|EDQM|2.2.44|Total organic carbon in water for pharmaceutical use (2.2.44.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20244|
|EDQM|2.2.46|Chromatographic separation techniques (2.2.46.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20246|
|EDQM|2.2.47|Capillary electrophoresis (2.2.47.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20247|
|EDQM|2.2.54|Isoelectric focusing (2.2.54.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20254|
|EDQM|2.2.55|Peptide mapping (2.2.55.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20255|
|EDQM|2.2.56|Amino acid analysis (2.2.56.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20256|
|EDQM|2.2.59|Glycan analysis of glycoproteins (2.2.59.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20259|
|EDQM|2.4.20|Determination of elemental impurities (2.4.20.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20420|
|EDQM|2.4.24|Identification and control of residual solvents (2.4.24.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20424|
|EDQM|2.5.12|Water: semi-micro determination (2.5.12.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20512|
|EDQM|2.5.32|Water: micro determination (2.5.32.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20532|
|EDQM|2.5.33|Total protein (2.5.33.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20533|
|EDQM|2.5.43|Size-exclusion chromatography for recombinant therapeutic monoclonal antibodies (2.5.43.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20543|
|EDQM|2.5.44|Capillary isoelectric focusing for recombinant therapeutic monoclonal antibodies (2.5.44.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20544|
|EDQM|2.6.1|Sterility (2.6.1.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20601|
|EDQM|2.6.12|Microbiological examination of non-sterile products: microbial enumeration tests (2.6.12.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20612|
|EDQM|2.6.13|Microbiological examination of non-sterile products: test for specified micro-organisms (2.6.13.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20613|
|EDQM|2.6.14|Bacterial endotoxins (2.6.14.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20614|
|EDQM|2.6.21|Nucleic acid amplification techniques (2.6.21.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20621|
|EDQM|2.6.30|Monocyte-activation test (2.6.30.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20630|
|EDQM|2.6.32|Test for bacterial endotoxins using recombinant factor C (2.6.32.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20632|
|EDQM|2.6.34|Host-cell protein assays (2.6.34.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20634|
|EDQM|2.6.35|Quantification and characterisation of residual host-cell DNA (2.6.35.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20635|
|EDQM|2.6.41|High-throughput sequencing for the detection of viral extraneous agents (2.6.41.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20641|
|EDQM|2.6.7|Mycoplasmas (2.6.7.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20607|
|EDQM|2.7.1|Immunochemical methods (2.7.1.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20701|
|EDQM|2.7.26|Cell-based assays for potency determination of TNF-alpha antagonists (2.7.26.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20726|
|EDQM|2.9.17|Test for extractable volume of parenteral preparations (2.9.17.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20917|
|EDQM|2.9.19|Particulate contamination: sub-visible particles (2.9.19.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20919|
|EDQM|2.9.20|Particulate contamination: visible particles (2.9.20.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20920|
|EDQM|3.2.1|Glass containers for pharmaceutical use (3.2.1.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/30201|
|EDQM|3.2.2|Plastic containers and closures for pharmaceutical use (3.2.2.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/30202|
|EDQM|3.2.9|Rubber closures for containers for aqueous parenteral preparations, for powders and for freeze-dried powders (3.2.9.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/30209|
|EDQM|5.1.1|Methods of preparation of sterile products (5.1.1.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50101|
|EDQM|5.1.10|Guidelines for using the test for bacterial endotoxins (5.1.10.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50110|
|EDQM|5.1.13|Pyrogenicity (5.1.13.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50113|
|EDQM|5.1.2|Biological indicators and related microbial preparations used in the manufacture of sterile products (5.1.2.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50102|
|EDQM|5.1.3|Efficacy of antimicrobial preservation (5.1.3.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50103|
|EDQM|5.1.4|Microbiological quality of non-sterile pharmaceutical preparations and substances for pharmaceutical use (5.1.4.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50104|
|EDQM|5.1.6|Alternative methods for control of microbiological quality (5.1.6.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50106|
|EDQM|5.1.7|Viral safety (5.1.7.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50107|
|EDQM|5.12|Reference standards (5.12.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/51200|
|EDQM|5.17.2|Recommendations on testing of particulate contamination: visible particles (5.17.2.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/51702|
|EDQM|5.20|Elemental impurities (5.20.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/52000|
|EDQM|5.26|Implementation of pharmacopoeial procedures (5.26.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/52600|
|EDQM|5.27|Comparability of alternative analytical procedures (5.27.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/52700|
|EDQM|5.3|Statistical analysis of results of biological assays and tests (5.3.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50300|
|EDQM|5.4|Residual solvents (5.4.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50400|
|EDQM|0784|Recombinant DNA technology, products of|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/784|
|EDQM|2031|Monoclonal antibodies for human use|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/2031|
|EDQM|2619|Pharmaceutical preparations|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/2619|
|EDQM|0520|Parenteral preparations|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/520|
|EDQM|2928|Infliximab concentrated solution|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/2928|
|EDQM|3103|Golimumab concentrated solution|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/3103|
|EDQM|3187|Golimumab injection|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/3187|
|EDQM|0169|Water for injections|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/169|
|EDQM|0008|Water, purified|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/8|
|USP|General Notices|General Notices and Requirements|https://doi.usp.org/USPNF/USPNF_M99989_11_01.html|
|EDQM|1|General notices (1.)|https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/10000|
