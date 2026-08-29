function metrics = validate_idrid_with_model(repoRoot, modelMatPath, splitName)
%VALIDATE_IDRID_WITH_MODEL Run external IDRiD validation using a trained model.
%
% This should be used before mixing IDRiD into training. It answers:
% "How well does the current APTOS-trained model generalize to India-origin
% IDRiD images?"
%
% Usage:
%   cd(fullfile('<repo-root>', 'matlab'))
%   startup
%   metrics = validate_idrid_with_model();
%
% Optional:
%   metrics = validate_idrid_with_model([], '../models/trained_dr_network.mat', "testing");
%   metrics = validate_idrid_with_model([], '../models/trained_dr_network.mat', "all");

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

modelVersion = localOptionalString(modelData, 'modelVersion', 'aptos-baseline-v1');
modelFamily = localOptionalString(modelData, 'modelFamily', class(modelData.trainedNet));

stores = create_idrid_datastore(repoRoot, inputSize, splitName);

reportsDir = fullfile(repoRoot, 'reports');
if ~isfolder(reportsDir)
    mkdir(reportsDir);
end

outputStem = "idrid_" + splitName + "_external_validation";
metricsPath = fullfile(reportsDir, outputStem + "_metrics.json");
datasetName = "idrid_disease_grading_" + splitName;

fprintf('Validating model on IDRiD disease grading split: %s\n', splitName);
fprintf('Model MAT: %s\n', modelMatPath);
fprintf('Model version: %s\n', modelVersion);
fprintf('Model family: %s\n\n', modelFamily);

metrics = evaluate_dr_classifier( ...
    modelData.trainedNet, ...
    stores.augData, ...
    stores.imds.Labels, ...
    metricsPath, ...
    classNames, ...
    datasetName);

summaryPath = fullfile(reportsDir, outputStem + "_summary.md");
localWriteIdridSummary(summaryPath, modelMatPath, modelVersion, modelFamily, splitName, stores, metrics);
end

function value = localOptionalString(modelData, fieldName, fallback)
if isfield(modelData, fieldName)
    value = string(modelData.(fieldName));
    if strlength(value) > 0
        return;
    end
end
value = string(fallback);
end

function localWriteIdridSummary(summaryPath, modelMatPath, modelVersion, modelFamily, splitName, stores, metrics)
fid = fopen(summaryPath, 'w');
assert(fid > 0, 'Could not open summary file for writing: %s', summaryPath);
cleanup = onCleanup(@() fclose(fid));

fprintf(fid, '# IDRiD External Validation\n\n');
fprintf(fid, 'This report validates the current APTOS-trained model on IDRiD disease-grading images. ');
fprintf(fid, 'IDRiD is used here for external validation, not for training.\n\n');

fprintf(fid, '## Model\n\n');
fprintf(fid, '- Model MAT: `%s`\n', modelMatPath);
fprintf(fid, '- Model version: `%s`\n', modelVersion);
fprintf(fid, '- Model family: %s\n', modelFamily);
fprintf(fid, '- Input size: %dx%dx%d\n\n', stores.inputSize);

fprintf(fid, '## Dataset\n\n');
fprintf(fid, '- Dataset: IDRiD disease grading\n');
fprintf(fid, '- Split: %s\n', splitName);
fprintf(fid, '- Images: %d\n\n', height(stores.indexTable));

fprintf(fid, '## Metrics\n\n');
fprintf(fid, '| Metric | Value |\n');
fprintf(fid, '|---|---:|\n');
fprintf(fid, '| Accuracy | %.4f |\n', metrics.accuracy);
fprintf(fid, '| Balanced accuracy | %.4f |\n', metrics.balanced_accuracy);
fprintf(fid, '| Macro F1 | %.4f |\n', metrics.macro_f1);
fprintf(fid, '| Quadratic weighted kappa | %.4f |\n', metrics.quadratic_weighted_kappa);
fprintf(fid, '| Referable DR sensitivity | %.4f |\n', metrics.referable_dr_sensitivity);
fprintf(fid, '| Referable DR specificity | %.4f |\n', metrics.referable_dr_specificity);
fprintf(fid, '| Referable DR AUC | %.4f |\n', metrics.referable_dr_auc);
fprintf(fid, '| False negatives | %d |\n', metrics.false_negative);
fprintf(fid, '| False positives | %d |\n\n', metrics.false_positive);

fprintf(fid, '## Interpretation\n\n');
fprintf(fid, '- If referable sensitivity is strong, the model is useful as a screening triage candidate.\n');
fprintf(fid, '- If specificity is weak, the model may over-refer and needs threshold tuning.\n');
fprintf(fid, '- If severe/proliferative recall is weak, add minority-class tuning before clinical claims.\n');
fprintf(fid, '- Do not claim India clinical validation from this alone; this is dataset validation only.\n');

clear cleanup;
fprintf('Saved IDRiD validation summary: %s\n', summaryPath);
end
