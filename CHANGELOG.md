# CHANGELOG.md

- Created `paper_f.docx` and `paper_f.pdf`.
- Backed up the prior Springer draft to `docs/Springer_TinyML_Driver_Distraction_Manuscript_before_expansion.backup_before_paper_f.docx`.
- Preserved the useful existing abstract/introduction/method/results content but expanded it into a full Springer/JRTIP-style manuscript.
- Replaced duplicate older result tables with newer `res/tables` evidence where overlapping content existed.
- Added formal sections for Related Work, Dataset and Class Definition, Transfer Learning Approach, Compact Student Network Architecture, layer-by-layer equations, inference algorithms, preliminary student selection, experimental setup, results, four-model comparison, literature comparison, deployment analysis, discussion, limitations, conclusion, and references.
- Inserted project figures next to the tables and discussion they support.
- Reported the mandatory shared student profile: 17 Keras layers, 10 learnable layers, 0.00553M parameters, and 7.81M FLOPs.
- Excluded simulator/Wokwi results from experimental claims and avoided using simulator timing as hardware evidence.
- Added 34 numbered references with DOI, arXiv, publisher, dataset, or technical-document links.
- Added `DATA_TRACEABILITY.md` mapping core claims, figures, and tables to source files.

Unresolved issues:
- Full DOCX visual render QA could not be completed in this shell because LibreOffice/Word automation was unavailable.
- Timing source files do not include full repeated-run statistics, warm-up counts, energy readings, or confidence intervals.
- The deployed-profile parameter count in `res` differs from a generic source-code reconstruction under default Keras bias assumptions; the manuscript reports the newer deployment-table value and notes the caveat.
