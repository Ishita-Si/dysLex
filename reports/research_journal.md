# DysLexAI Research Journal

This journal records Phase 1 dataset observations, data-quality risks, and future engineering ideas for the DysLexAI research prototype.

## ETDD70 Eye Tracking Dataset

**Purpose:** Reading Behavior Analysis

**Source:** Place ETDD70 files under datasets/reading/

### Observations

- The reading dataset contains 70 samples and 4 recorded fields.

### Problems Found

- Unexpected file extension for data.zip.
- Unexpected file extension for fixation_images.zip.
- Unexpected file extension for README.md.
- Unexpected file extension for rois.zip.
- Unexpected file extension for stimuli.zip.
- Unexpected file extension for 13332134.zip.

### Data Quality Issues

- The reading dataset requires attention because unexpected file extension for data.zip.
- The reading dataset requires attention because unexpected file extension for fixation_images.zip.
- The reading dataset requires attention because unexpected file extension for readme.md.
- The reading dataset requires attention because unexpected file extension for rois.zip.
- The reading dataset requires attention because unexpected file extension for stimuli.zip.
- The reading dataset requires attention because unexpected file extension for 13332134.zip.

### Potential Risks

- Eye-tracking features can be sensitive to device calibration, screen distance, and task protocol differences.
- Small or imbalanced samples may lead to unstable conclusions if they are used for later supervised learning.

### Cleaning Strategies

- Standardize column names and units before feature extraction.
- Remove impossible negative duration values and document every threshold.
- Keep participant identifiers separate from model-ready features.

### Future Feature Engineering Ideas

- Compute fixation-duration summaries for each reading passage.
- Estimate regression frequency and gaze transition stability.
- Create passage-normalized reading time features.

## Synthetic Dyslexia Handwriting Dataset

**Purpose:** Handwriting Analysis

**Source:** Place handwriting image folders under datasets/writing/

### Observations

- The handwriting dataset folder is currently empty, so only placeholder figures were generated.

### Problems Found

- Unexpected file extension for Dataset Dyslexia_Password WanAsy321.rar.
- Unexpected file extension for archive.zip.
- No readable handwriting image files were found.

### Data Quality Issues

- The writing dataset requires attention because unexpected file extension for dataset dyslexia_password wanasy321.rar.
- The writing dataset requires attention because unexpected file extension for archive.zip.
- The writing dataset requires attention because no readable handwriting image files were found.

### Potential Risks

- Handwriting images can encode scanner, camera, or paper artifacts that are unrelated to dyslexia risk.
- Small or imbalanced samples may lead to unstable conclusions if they are used for later supervised learning.

### Cleaning Strategies

- Remove unreadable image files and normalize image orientation.
- Resize images only after preserving original resolution metadata.
- Audit labels derived from folder names before training data is created.

### Future Feature Engineering Ideas

- Extract connected-component statistics from handwritten symbols.
- Measure spacing regularity and baseline drift across text lines.
- Compare texture descriptors across dyslexic and non-dyslexic classes.

## Typing Fluencies of Dyslexia Students and Peers

**Purpose:** Typing Behavior Analysis

**Source:** Place keystroke logs under datasets/typing/

### Observations

- The typing dataset folder is currently empty, so only placeholder figures were generated.

### Problems Found

- No dataset files were found in the expected directory.
- No readable tabular records were loaded.

### Data Quality Issues

- The typing dataset requires attention because no dataset files were found in the expected directory.
- The typing dataset requires attention because no readable tabular records were loaded.

### Potential Risks

- Typing behavior can be affected by keyboard layout, fatigue, language familiarity, and device latency.
- Small or imbalanced samples may lead to unstable conclusions if they are used for later supervised learning.

### Cleaning Strategies

- Sort typing events by participant, session, and timestamp.
- Remove impossible negative latencies after preserving raw records.
- Normalize event names across files before aggregating sessions.

### Future Feature Engineering Ideas

- Aggregate key hold times and key flight times by session.
- Measure long-pause frequency and correction behavior.
- Create participant-level rhythm features across repeated sessions.

