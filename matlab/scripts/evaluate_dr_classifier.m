function metrics = evaluate_dr_classifier(trainedNet, validationData, trueLabels, outputJsonPath, classNames)
%EVALUATE_DR_CLASSIFIER Evaluate DR classifier with screening-first metrics.
%
% Primary clinical screening metric:
%   referable DR = class grade >= 2

if nargin < 5 || isempty(classNames)
    classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
end

[predLabels, scores] = localPredictLabelsAndScores(trainedNet, validationData, classNames);

classOrder = categorical(classNames, classNames);
confMat = confusionmat(trueLabels, predLabels, 'Order', classOrder);

trueGrades = localLabelsToGrades(trueLabels);
predGrades = localLabelsToGrades(predLabels);

trueReferable = trueGrades >= 2;
predReferable = predGrades >= 2;

tp = sum(trueReferable & predReferable);
tn = sum(~trueReferable & ~predReferable);
fp = sum(~trueReferable & predReferable);
fn = sum(trueReferable & ~predReferable);

accuracy = mean(predLabels == trueLabels);
sensitivity = localRatio(tp, tp + fn);
specificity = localRatio(tn, tn + fp);

classPrecision = diag(confMat) ./ max(sum(confMat, 1)', 1);
classRecall = diag(confMat) ./ max(sum(confMat, 2), 1);

auc = NaN;
try
    referableColumns = [false false true true true];
    referableScore = sum(scores(:, referableColumns), 2);
    [~, ~, ~, auc] = perfcurve(trueReferable, referableScore, true);
catch
    fprintf('AUC skipped because perfcurve or probability scores were unavailable.\n');
end

metrics = struct( ...
    'dataset', 'aptos2019_validation_split', ...
    'sample_count', numel(trueLabels), ...
    'accuracy', accuracy, ...
    'referable_dr_sensitivity', sensitivity, ...
    'referable_dr_specificity', specificity, ...
    'referable_dr_auc', auc, ...
    'true_positive', tp, ...
    'true_negative', tn, ...
    'false_positive', fp, ...
    'false_negative', fn, ...
    'class_names', classNames, ...
    'confusion_matrix', confMat, ...
    'class_precision', classPrecision, ...
    'class_recall', classRecall ...
);

fprintf('\nValidation metrics:\n');
fprintf('  Accuracy: %.4f\n', accuracy);
fprintf('  Referable DR sensitivity: %.4f\n', sensitivity);
fprintf('  Referable DR specificity: %.4f\n', specificity);
if ~isnan(auc)
    fprintf('  Referable DR AUC: %.4f\n', auc);
end

if nargin >= 4 && strlength(string(outputJsonPath)) > 0
    outputDir = fileparts(outputJsonPath);
    if ~isempty(outputDir) && ~isfolder(outputDir)
        mkdir(outputDir);
    end

    fid = fopen(outputJsonPath, 'w');
    assert(fid > 0, 'Could not open metrics file for writing: %s', outputJsonPath);
    cleanup = onCleanup(@() fclose(fid));
    fwrite(fid, jsonencode(metrics), 'char');
    clear cleanup;
    fprintf('Saved metrics: %s\n', outputJsonPath);
end
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
