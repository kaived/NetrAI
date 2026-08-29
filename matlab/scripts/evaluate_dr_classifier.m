function metrics = evaluate_dr_classifier(trainedNet, validationData, trueLabels, outputJsonPath, classNames, datasetName)
%EVALUATE_DR_CLASSIFIER Evaluate DR classifier with screening-first metrics.
%
% Primary clinical screening metric:
%   referable DR = class grade >= 2

if nargin < 5 || isempty(classNames)
    classNames = ["no_dr", "mild", "moderate", "severe", "proliferative_dr"];
end

if nargin < 6 || isempty(datasetName) || strlength(string(datasetName)) == 0
    datasetName = "aptos2019_validation_split";
end

[predLabels, scores] = localPredictLabelsAndScores(trainedNet, validationData, classNames);
scores = localScoresToProbabilities(scores);

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
referablePrecision = localRatio(tp, tp + fp);
referableF1 = localRatio(2 * referablePrecision * sensitivity, referablePrecision + sensitivity);

classPrecision = diag(confMat) ./ max(sum(confMat, 1)', 1);
classRecall = diag(confMat) ./ max(sum(confMat, 2), 1);
classF1 = (2 .* classPrecision .* classRecall) ./ max(classPrecision + classRecall, eps);
classSupport = sum(confMat, 2);
macroPrecision = mean(classPrecision, 'omitnan');
macroRecall = mean(classRecall, 'omitnan');
macroF1 = mean(classF1, 'omitnan');
balancedAccuracy = macroRecall;
quadraticWeightedKappa = localQuadraticWeightedKappa(trueGrades, predGrades, 0:4);

predConfidence = max(scores, [], 2);
confidenceMean = mean(predConfidence, 'omitnan');
confidenceMedian = median(predConfidence, 'omitnan');
lowConfidenceCount = sum(predConfidence < 0.50);
moderateConfidenceCount = sum(predConfidence >= 0.50 & predConfidence < 0.70);
highConfidenceCount = sum(predConfidence >= 0.70);

auc = NaN;
bestReferableThreshold = NaN;
thresholdSensitivity = NaN;
thresholdSpecificity = NaN;
thresholdFalseNegative = NaN;
thresholdFalsePositive = NaN;
try
    referableColumns = [false false true true true];
    referableScore = sum(scores(:, referableColumns), 2);
    [~, ~, ~, auc] = perfcurve(trueReferable, referableScore, true);
    thresholdMetrics = localTuneReferableThreshold(trueReferable, referableScore, 0.88);
    bestReferableThreshold = thresholdMetrics.threshold;
    thresholdSensitivity = thresholdMetrics.sensitivity;
    thresholdSpecificity = thresholdMetrics.specificity;
    thresholdFalseNegative = thresholdMetrics.false_negative;
    thresholdFalsePositive = thresholdMetrics.false_positive;
catch
    fprintf('AUC skipped because perfcurve or probability scores were unavailable.\n');
end

metrics = struct( ...
    'dataset', char(string(datasetName)), ...
    'sample_count', numel(trueLabels), ...
    'accuracy', accuracy, ...
    'balanced_accuracy', balancedAccuracy, ...
    'macro_precision', macroPrecision, ...
    'macro_recall', macroRecall, ...
    'macro_f1', macroF1, ...
    'quadratic_weighted_kappa', quadraticWeightedKappa, ...
    'referable_dr_sensitivity', sensitivity, ...
    'referable_dr_specificity', specificity, ...
    'referable_dr_precision', referablePrecision, ...
    'referable_dr_f1', referableF1, ...
    'referable_dr_auc', auc, ...
    'recommended_referable_threshold', bestReferableThreshold, ...
    'threshold_referable_sensitivity', thresholdSensitivity, ...
    'threshold_referable_specificity', thresholdSpecificity, ...
    'threshold_false_negative', thresholdFalseNegative, ...
    'threshold_false_positive', thresholdFalsePositive, ...
    'true_positive', tp, ...
    'true_negative', tn, ...
    'false_positive', fp, ...
    'false_negative', fn, ...
    'class_names', classNames, ...
    'confusion_matrix', confMat, ...
    'class_precision', classPrecision, ...
    'class_recall', classRecall, ...
    'class_f1', classF1, ...
    'class_support', classSupport, ...
    'confidence_mean', confidenceMean, ...
    'confidence_median', confidenceMedian, ...
    'low_confidence_count', lowConfidenceCount, ...
    'moderate_confidence_count', moderateConfidenceCount, ...
    'high_confidence_count', highConfidenceCount ...
);

fprintf('\nValidation metrics:\n');
fprintf('  Accuracy: %.4f\n', accuracy);
fprintf('  Balanced accuracy: %.4f\n', balancedAccuracy);
fprintf('  Macro F1: %.4f\n', macroF1);
fprintf('  Quadratic weighted kappa: %.4f\n', quadraticWeightedKappa);
fprintf('  Referable DR sensitivity: %.4f\n', sensitivity);
fprintf('  Referable DR specificity: %.4f\n', specificity);
if ~isnan(auc)
    fprintf('  Referable DR AUC: %.4f\n', auc);
end
if ~isnan(bestReferableThreshold)
    fprintf('  Tuned referable threshold: %.3f (sensitivity %.4f, specificity %.4f)\n', ...
        bestReferableThreshold, thresholdSensitivity, thresholdSpecificity);
end

if nargin >= 4 && ~isempty(outputJsonPath) && strlength(string(outputJsonPath)) > 0
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

function kappa = localQuadraticWeightedKappa(trueGrades, predGrades, gradeValues)
validRows = ~isnan(trueGrades) & ~isnan(predGrades);
trueGrades = trueGrades(validRows);
predGrades = predGrades(validRows);

if isempty(trueGrades)
    kappa = NaN;
    return;
end

numGrades = numel(gradeValues);
observed = zeros(numGrades, numGrades);

for row = 1:numel(trueGrades)
    trueIdx = find(gradeValues == trueGrades(row), 1);
    predIdx = find(gradeValues == predGrades(row), 1);
    if ~isempty(trueIdx) && ~isempty(predIdx)
        observed(trueIdx, predIdx) = observed(trueIdx, predIdx) + 1;
    end
end

trueHistogram = sum(observed, 2);
predHistogram = sum(observed, 1);
expected = trueHistogram * predHistogram / max(sum(observed(:)), eps);

weights = zeros(numGrades, numGrades);
for row = 1:numGrades
    for col = 1:numGrades
        weights(row, col) = ((row - col) ^ 2) / ((numGrades - 1) ^ 2);
    end
end

weightedObserved = sum(sum(weights .* observed));
weightedExpected = sum(sum(weights .* expected));

if weightedExpected == 0
    kappa = NaN;
else
    kappa = 1 - (weightedObserved / weightedExpected);
end
end

function thresholdMetrics = localTuneReferableThreshold(trueReferable, referableScore, minimumSpecificity)
thresholds = linspace(0.05, 0.95, 181);
best = struct( ...
    'threshold', NaN, ...
    'sensitivity', -Inf, ...
    'specificity', -Inf, ...
    'false_negative', Inf, ...
    'false_positive', Inf ...
);

for idx = 1:numel(thresholds)
    threshold = thresholds(idx);
    predictedReferable = referableScore >= threshold;

    tp = sum(trueReferable & predictedReferable);
    tn = sum(~trueReferable & ~predictedReferable);
    fp = sum(~trueReferable & predictedReferable);
    fn = sum(trueReferable & ~predictedReferable);

    sensitivity = localRatio(tp, tp + fn);
    specificity = localRatio(tn, tn + fp);

    if specificity < minimumSpecificity
        continue;
    end

    if sensitivity > best.sensitivity || ...
            (sensitivity == best.sensitivity && specificity > best.specificity)
        best.threshold = threshold;
        best.sensitivity = sensitivity;
        best.specificity = specificity;
        best.false_negative = fn;
        best.false_positive = fp;
    end
end

if isnan(best.threshold)
    [~, bestIdx] = max(referableScore);
    fallbackThreshold = min(max(referableScore(bestIdx), 0.05), 0.95);
    best.threshold = fallbackThreshold;
    best.sensitivity = NaN;
    best.specificity = NaN;
    best.false_negative = NaN;
    best.false_positive = NaN;
end

thresholdMetrics = best;
end
