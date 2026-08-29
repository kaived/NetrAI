function result = predict_aptos_sample(imagePath, modelMatPath)
%PREDICT_APTOS_SAMPLE Run one image through the trained MATLAB classifier.
%
% Usage:
%   imagePath = fullfile('<repo-root>', 'data', 'raw', 'aptos2019', 'train_images', '000c1434d8d7.png');
%   result = predict_aptos_sample(imagePath)

scriptDir = fileparts(mfilename('fullpath'));
repoRoot = fileparts(fileparts(scriptDir));

if nargin < 2 || isempty(modelMatPath) || strlength(string(modelMatPath)) == 0
    modelMatPath = fullfile(repoRoot, 'models', 'trained_dr_network.mat');
end

assert(isfile(imagePath), 'Image not found: %s', imagePath);
assert(isfile(modelMatPath), 'Model file not found: %s', modelMatPath);

modelData = load(modelMatPath, 'trainedNet', 'inputSize', 'classNames');
image = imread(imagePath);
quality = retinascan.m1.assessQuality(image, struct());
networkInput = retinascan.io.readAndPreprocessForNetwork(imagePath, modelData.inputSize);

[predLabel, confidence] = localPredictOne(modelData.trainedNet, networkInput, modelData.classNames);
predLabel = string(predLabel);
grade = localLabelToGrade(predLabel);

result = struct( ...
    'image_path', imagePath, ...
    'quality', quality, ...
    'label', predLabel, ...
    'icdr_grade', grade, ...
    'referable_dr', grade >= 2, ...
    'confidence', confidence ...
);

fprintf('Prediction: %s | Grade: %d | Referable DR: %d | Confidence: %.4f\n', ...
    predLabel, grade, grade >= 2, confidence);
end

function grade = localLabelToGrade(label)
switch label
    case "no_dr"
        grade = 0;
    case "mild"
        grade = 1;
    case "moderate"
        grade = 2;
    case "severe"
        grade = 3;
    case "proliferative_dr"
        grade = 4;
    otherwise
        grade = NaN;
end
end

function [predLabel, confidence] = localPredictOne(trainedNet, networkInput, classNames)
if isa(trainedNet, 'dlnetwork')
    scores = predict(trainedNet, networkInput);
    scores = localScoresToVector(scores);
    predLabel = scores2label(scores, classNames);
    confidence = max(scores);
    return;
end

[predLabel, scores] = classify(trainedNet, networkInput);
scores = localScoresToVector(scores);
confidence = max(scores);
end

function scores = localScoresToVector(scores)
if isa(scores, 'dlarray')
    scores = extractdata(scores);
end

scores = double(squeeze(scores));
scores = scores(:)';
end
