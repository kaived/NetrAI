function explanation = generateGradCam(trainedNet, image, classNames, targetLabel, featureLayer)
%GENERATEGRADCAM Generate true model-layer Grad-CAM for a classifier.
%
% This function uses MATLAB Deep Learning Toolbox gradCAM when available.
% It expects the same preprocessed image shape used by the classifier.

if nargin < 3 || isempty(classNames)
    classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
end

if nargin < 4
    targetLabel = [];
end

if nargin < 5
    featureLayer = "";
end

assert(~isempty(image), 'Input image is empty.');
assert(exist('gradCAM', 'file') == 2, ...
    'Deep Learning Toolbox gradCAM function was not found in this MATLAB installation.');

image = im2single(image);
if ndims(image) == 2
    image = repmat(image, 1, 1, 3);
end

[predictedLabel, scores] = localPredictSingle(trainedNet, image, classNames);

if isempty(targetLabel) || strlength(string(targetLabel)) == 0
    targetLabel = predictedLabel;
else
    targetLabel = categorical(string(targetLabel), classNames);
end

if strlength(string(featureLayer)) == 0
    featureLayer = localFindLastConvolutionLayer(trainedNet);
end

heatmap = localCallGradCam(trainedNet, image, targetLabel, featureLayer);
heatmap = mat2gray(heatmap);

explanation = struct( ...
    'method', 'grad_cam', ...
    'predictedLabel', char(string(predictedLabel)), ...
    'targetLabel', char(string(targetLabel)), ...
    'featureLayer', char(string(featureLayer)), ...
    'scores', scores, ...
    'heatmap', heatmap, ...
    'notes', {{'True model-layer Grad-CAM generated from classifier gradients.'}} ...
);
end

function [predictedLabel, scores] = localPredictSingle(trainedNet, image, classNames)
if isa(trainedNet, 'dlnetwork')
    dlImage = dlarray(reshape(single(image), size(image, 1), size(image, 2), size(image, 3), 1), 'SSCB');
    rawScores = predict(trainedNet, dlImage);
    scores = localScoresToVector(rawScores);
    scores = localScoresToProbabilities(scores);
    [~, maxIdx] = max(scores);
    predictedLabel = categorical(classNames(maxIdx), classNames);
    return;
end

[predictedLabel, scores] = classify(trainedNet, image);
scores = localScoresToVector(scores);
scores = localScoresToProbabilities(scores);
predictedLabel = categorical(string(predictedLabel), classNames);
end

function scores = localScoresToVector(scores)
if isa(scores, 'dlarray')
    scores = extractdata(scores);
end

scores = double(squeeze(scores));
scores = scores(:)';
end

function scores = localScoresToProbabilities(scores)
rowSum = sum(scores);
looksLikeProbabilities = all(scores >= -1e-6) && abs(rowSum - 1) < 0.05;

if looksLikeProbabilities
    scores = max(scores, 0);
    scores = scores ./ max(sum(scores), eps);
    return;
end

scores = scores - max(scores);
expScores = exp(scores);
scores = expScores ./ max(sum(expScores), eps);
end

function featureLayer = localFindLastConvolutionLayer(trainedNet)
assert(isprop(trainedNet, 'Layers'), 'Network does not expose Layers; pass featureLayer explicitly.');

layers = trainedNet.Layers;
layerNames = strings(numel(layers), 1);
isConv = false(numel(layers), 1);

for idx = 1:numel(layers)
    layerNames(idx) = string(layers(idx).Name);
    className = string(class(layers(idx)));
    isConv(idx) = contains(className, 'Convolution', 'IgnoreCase', true);
end

matchIdx = find(isConv, 1, 'last');
assert(~isempty(matchIdx), 'Could not find a convolution layer for Grad-CAM.');
featureLayer = layerNames(matchIdx);
end

function heatmap = localCallGradCam(trainedNet, image, targetLabel, featureLayer)
try
    heatmap = gradCAM(trainedNet, image, targetLabel, 'FeatureLayer', char(featureLayer));
    return;
catch
end

try
    heatmap = gradCAM(trainedNet, image, targetLabel, FeatureLayer=char(featureLayer));
    return;
catch
end

heatmap = gradCAM(trainedNet, image, targetLabel);
end
