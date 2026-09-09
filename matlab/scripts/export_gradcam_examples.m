function summary = export_gradcam_examples(repoRoot, modelMatPath, datasetName, splitName, maxExamples)
%EXPORT_GRADCAM_EXAMPLES Export true Grad-CAM examples for model review.
%
% Usage:
%   cd(fullfile('<repo-root>', 'matlab'))
%   startup
%   summary = export_gradcam_examples([], '../models/trained_dr_network.mat', "aptos", "validation", 12);

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

if nargin < 2 || isempty(modelMatPath) || strlength(string(modelMatPath)) == 0
    modelMatPath = fullfile(repoRoot, 'models', 'trained_dr_network.mat');
else
    modelMatPath = char(string(modelMatPath));
    if ~isfile(modelMatPath)
        modelMatPath = fullfile(repoRoot, modelMatPath);
    end
end

if nargin < 3 || isempty(datasetName)
    datasetName = "aptos";
end

if nargin < 4 || isempty(splitName)
    splitName = "validation";
end

if nargin < 5 || isempty(maxExamples)
    maxExamples = 12;
end

repoRoot = char(repoRoot);
assert(isfile(modelMatPath), 'Model MAT file not found: %s', modelMatPath);

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

[files, labels, datasetTag] = localSelectExamples(repoRoot, string(datasetName), string(splitName), inputSize, maxExamples);

outputDir = fullfile(repoRoot, 'reports', 'gradcam', char(datasetTag));
if ~isfolder(outputDir)
    mkdir(outputDir);
end

rows = struct('image_id', {}, 'label', {}, 'predicted_label', {}, 'target_label', {}, 'feature_layer', {}, 'heatmap_path', {}, 'overlay_path', {});

for idx = 1:numel(files)
    image = retinascan.io.readAndPreprocessForNetwork(files{idx}, inputSize);
    explanation = retinascan.m4.generateGradCam(modelData.trainedNet, image, classNames);

    [~, imageId, ~] = fileparts(files{idx});
    heatmapPath = fullfile(outputDir, [imageId '_gradcam.png']);
    overlayPath = fullfile(outputDir, [imageId '_gradcam_overlay.png']);

    imwrite(explanation.heatmap, heatmapPath);
    overlay = localOverlayHeatmap(image, explanation.heatmap);
    imwrite(overlay, overlayPath);

    rows(idx).image_id = imageId; %#ok<AGROW>
    rows(idx).label = char(string(labels(idx))); %#ok<AGROW>
    rows(idx).predicted_label = explanation.predictedLabel; %#ok<AGROW>
    rows(idx).target_label = explanation.targetLabel; %#ok<AGROW>
    rows(idx).feature_layer = explanation.featureLayer; %#ok<AGROW>
    rows(idx).heatmap_path = heatmapPath; %#ok<AGROW>
    rows(idx).overlay_path = overlayPath; %#ok<AGROW>
end

summary = struct( ...
    'dataset', char(datasetTag), ...
    'model_mat_path', modelMatPath, ...
    'example_count', numel(files), ...
    'output_dir', outputDir, ...
    'examples', rows ...
);

summaryPath = fullfile(outputDir, 'gradcam_examples_summary.json');
fid = fopen(summaryPath, 'w');
assert(fid > 0, 'Could not open summary JSON: %s', summaryPath);
cleanup = onCleanup(@() fclose(fid));
fwrite(fid, jsonencode(summary), 'char');
clear cleanup;

fprintf('Exported %d Grad-CAM example(s) to %s\n', numel(files), outputDir);
end

function [files, labels, datasetTag] = localSelectExamples(repoRoot, datasetName, splitName, inputSize, maxExamples)
if datasetName == "idrid"
    stores = create_idrid_datastore(repoRoot, inputSize, splitName);
    sourceFiles = stores.imds.Files;
    sourceLabels = stores.imds.Labels;
    datasetTag = "idrid_" + splitName;
else
    splitPath = fullfile(repoRoot, 'data', 'splits', 'aptos2019_split_v1.csv');
    stores = create_aptos_datastores(repoRoot, inputSize, 0.20, splitPath, false);
    sourceFiles = stores.valImds.Files;
    sourceLabels = stores.valImds.Labels;
    datasetTag = "aptos_validation";
end

count = min(maxExamples, numel(sourceFiles));
files = sourceFiles(1:count);
labels = sourceLabels(1:count);
end

function overlay = localOverlayHeatmap(image, heatmap)
image = im2single(image);
heatmap = imresize(mat2gray(heatmap), [size(image, 1), size(image, 2)]);
colored = ind2rgb(gray2ind(heatmap, 256), jet(256));
alpha = 0.45 * heatmap;
overlay = image .* (1 - alpha) + colored .* alpha;
overlay = im2uint8(mat2gray(overlay));
end
