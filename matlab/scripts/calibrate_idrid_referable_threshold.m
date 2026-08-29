function calibration = calibrate_idrid_referable_threshold(repoRoot, modelMatPath, splitName, minimumSensitivity)
%CALIBRATE_IDRID_REFERABLE_THRESHOLD Tune referable-DR threshold on IDRiD.
%
% This is calibration only. It does not train the model or modify weights.
% It chooses a threshold for:
%   referable_probability = P(moderate) + P(severe) + P(proliferative_dr)
%
% Usage:
%   calibration = calibrate_idrid_referable_threshold();
%   calibration = calibrate_idrid_referable_threshold([], '../models/trained_dr_network.mat', "testing", 0.90);

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);

if nargin < 2 || isempty(modelMatPath) || strlength(string(modelMatPath)) == 0
    modelMatPath = fullfile(repoRoot, 'models', 'trained_dr_network.mat');
else
    modelMatPath = char(string(modelMatPath));
    if ~isfile(modelMatPath)
        modelMatPath = fullfile(repoRoot, modelMatPath);
    end
end

if nargin < 3 || isempty(splitName) || strlength(string(splitName)) == 0
    splitName = "testing";
end

if nargin < 4 || isempty(minimumSensitivity)
    minimumSensitivity = 0.90;
end

splitName = lower(string(splitName));
assert(isfile(modelMatPath), 'Trained model MAT file not found: %s', modelMatPath);

modelData = load(modelMatPath);
assert(isfield(modelData, 'trainedNet'), 'Model MAT file must contain variable: trainedNet');

if isfield(modelData, 'inputSize')
    inputSize = modelData.inputSize;
else
    inputSize = [224 224 3];
end

if isfield(modelData, 'classNames')
    classNames = string(modelData.classNames);
else
    classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
end

stores = create_idrid_datastore(repoRoot, inputSize, splitName);
[~, scores] = localPredictLabelsAndScores(modelData.trainedNet, stores.augData, classNames);
scores = localScoresToProbabilities(scores);

trueGrades = localLabelsToGrades(stores.imds.Labels);
trueReferable = trueGrades >= 2;
referableScore = sum(scores(:, 3:5), 2);
thresholds = linspace(0.05, 0.95, 181);

rows = struct( ...
    'threshold', {}, ...
    'sensitivity', {}, ...
    'specificity', {}, ...
    'precision', {}, ...
    'f1', {}, ...
    'false_negative', {}, ...
    'false_positive', {}, ...
    'true_positive', {}, ...
    'true_negative', {} ...
);

bestIdx = NaN;
bestScore = -Inf;
for idx = 1:numel(thresholds)
    threshold = thresholds(idx);
    predReferable = referableScore >= threshold;

    tp = sum(trueReferable & predReferable);
    tn = sum(~trueReferable & ~predReferable);
    fp = sum(~trueReferable & predReferable);
    fn = sum(trueReferable & ~predReferable);

    sensitivity = localRatio(tp, tp + fn);
    specificity = localRatio(tn, tn + fp);
    precision = localRatio(tp, tp + fp);
    f1 = localRatio(2 * precision * sensitivity, precision + sensitivity);

    rows(idx).threshold = threshold; %#ok<AGROW>
    rows(idx).sensitivity = sensitivity; %#ok<AGROW>
    rows(idx).specificity = specificity; %#ok<AGROW>
    rows(idx).precision = precision; %#ok<AGROW>
    rows(idx).f1 = f1; %#ok<AGROW>
    rows(idx).false_negative = fn; %#ok<AGROW>
    rows(idx).false_positive = fp; %#ok<AGROW>
    rows(idx).true_positive = tp; %#ok<AGROW>
    rows(idx).true_negative = tn; %#ok<AGROW>

    if sensitivity >= minimumSensitivity
        objective = specificity + (0.20 * sensitivity) + (0.05 * f1);
        if objective > bestScore
            bestScore = objective;
            bestIdx = idx;
        end
    end
end

if isnan(bestIdx)
    [~, bestIdx] = max([rows.f1]);
end

recommended = rows(bestIdx);

reportsDir = fullfile(repoRoot, 'reports');
if ~isfolder(reportsDir)
    mkdir(reportsDir);
end

outputStem = "idrid_" + splitName + "_referable_threshold_calibration";
jsonPath = fullfile(reportsDir, outputStem + ".json");
summaryPath = fullfile(reportsDir, outputStem + ".md");

calibration = struct( ...
    'dataset', char("idrid_disease_grading_" + splitName), ...
    'sample_count', numel(trueReferable), ...
    'minimum_sensitivity', minimumSensitivity, ...
    'recommended_threshold', recommended.threshold, ...
    'recommended_sensitivity', recommended.sensitivity, ...
    'recommended_specificity', recommended.specificity, ...
    'recommended_precision', recommended.precision, ...
    'recommended_f1', recommended.f1, ...
    'recommended_false_negative', recommended.false_negative, ...
    'recommended_false_positive', recommended.false_positive, ...
    'threshold_grid', rows ...
);

fid = fopen(jsonPath, 'w');
assert(fid > 0, 'Could not open calibration JSON for writing: %s', jsonPath);
cleanup = onCleanup(@() fclose(fid));
fwrite(fid, jsonencode(calibration), 'char');
clear cleanup;

localWriteSummary(summaryPath, splitName, minimumSensitivity, calibration);

fprintf('\nIDRiD referable threshold calibration:\n');
fprintf('  Recommended threshold: %.3f\n', calibration.recommended_threshold);
fprintf('  Sensitivity: %.4f\n', calibration.recommended_sensitivity);
fprintf('  Specificity: %.4f\n', calibration.recommended_specificity);
fprintf('  False negatives: %d\n', calibration.recommended_false_negative);
fprintf('  False positives: %d\n', calibration.recommended_false_positive);
fprintf('Saved calibration JSON: %s\n', jsonPath);
end

function [predLabels, scores] = localPredictLabelsAndScores(trainedNet, validationData, classNames)
if isa(trainedNet, 'dlnetwork')
    scores = minibatchpredict(trainedNet, validationData);
    scores = localScoresToMatrix(scores);
    predLabels = scores2label(scores, classNames);
    predLabels = categorical(string(predLabels), classNames);
    return;
end

[predLabels, scores] = classify(trainedNet, validationData);
predLabels = categorical(string(predLabels), classNames);
scores = localScoresToMatrix(scores);
end

function scores = localScoresToMatrix(scores)
if isa(scores, 'dlarray')
    scores = extractdata(scores);
end

scores = double(squeeze(scores));

if isvector(scores)
    scores = reshape(scores, 1, []);
end

if size(scores, 1) == 5
    scores = scores';
end
end

function scores = localScoresToProbabilities(scores)
scores = double(scores);
rowSums = sum(scores, 2);
looksLikeProbability = all(scores(:) >= -1e-6) && mean(abs(rowSums - 1), 'omitnan') < 0.05;

if looksLikeProbability
    scores = max(scores, 0);
    scores = scores ./ max(sum(scores, 2), eps);
    return;
end

scores = scores - max(scores, [], 2);
expScores = exp(scores);
scores = expScores ./ max(sum(expScores, 2), eps);
end

function grades = localLabelsToGrades(labels)
labels = string(labels);
grades = NaN(size(labels));
grades(labels == "no_dr") = 0;
grades(labels == "mild") = 1;
grades(labels == "moderate") = 2;
grades(labels == "severe") = 3;
grades(labels == "proliferative_dr") = 4;
end

function value = localRatio(numerator, denominator)
if denominator == 0
    value = NaN;
else
    value = numerator / denominator;
end
end

function localWriteSummary(summaryPath, splitName, minimumSensitivity, calibration)
fid = fopen(summaryPath, 'w');
assert(fid > 0, 'Could not open calibration summary for writing: %s', summaryPath);
cleanup = onCleanup(@() fclose(fid));

fprintf(fid, '# IDRiD Referable Threshold Calibration\n\n');
fprintf(fid, 'This report calibrates the referable-DR decision threshold on IDRiD. ');
fprintf(fid, 'It does not train or modify model weights.\n\n');
fprintf(fid, '- Dataset split: %s\n', splitName);
fprintf(fid, '- Minimum sensitivity target: %.2f\n', minimumSensitivity);
fprintf(fid, '- Recommended threshold: %.3f\n\n', calibration.recommended_threshold);

fprintf(fid, '## Recommended Operating Point\n\n');
fprintf(fid, '| Metric | Value |\n');
fprintf(fid, '|---|---:|\n');
fprintf(fid, '| Sensitivity | %.4f |\n', calibration.recommended_sensitivity);
fprintf(fid, '| Specificity | %.4f |\n', calibration.recommended_specificity);
fprintf(fid, '| Precision | %.4f |\n', calibration.recommended_precision);
fprintf(fid, '| F1 | %.4f |\n', calibration.recommended_f1);
fprintf(fid, '| False negatives | %d |\n', calibration.recommended_false_negative);
fprintf(fid, '| False positives | %d |\n\n', calibration.recommended_false_positive);

fprintf(fid, '## How To Use\n\n');
fprintf(fid, 'Set the backend environment variable after clinical/product review:\n\n');
fprintf(fid, '```text\n');
fprintf(fid, 'MODEL_REFERABLE_THRESHOLD=%.3f\n', calibration.recommended_threshold);
fprintf(fid, '```\n\n');
fprintf(fid, 'For SIH demo, keep the default `0.50` unless you explicitly want to demonstrate India-origin calibration.\n');

clear cleanup;
fprintf('Saved calibration summary: %s\n', summaryPath);
end
