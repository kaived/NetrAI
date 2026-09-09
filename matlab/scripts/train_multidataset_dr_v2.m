function [trainedNet, info, validationMetrics, externalMetrics] = train_multidataset_dr_v2(repoRoot, maxEpochs)
%TRAIN_MULTIDATASET_DR_V2 Train the next DR classifier candidate.
%
% This experiment targets Grade 3/4 sensitivity with:
%   - APTOS fixed train split
%   - IDRiD disease-grading training split
%   - Grade 3/4 oversampling
%   - camera/device-style augmentation
%
% It does not replace backend/models/dr_classifier.onnx automatically.

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

if nargin < 2 || isempty(maxEpochs)
    maxEpochs = 16;
end

repoRoot = char(repoRoot);
modelVersion = 'multidataset-dr-v2';
outputStem = 'multidataset_dr_v2';
inputSize = [224 224 3];
miniBatchSize = 32;
initialLearnRate = 7e-5;
seed = 20260908;

rng(seed, 'twister');

modelsDir = fullfile(repoRoot, 'models');
reportsDir = fullfile(repoRoot, 'reports');
backendModelsDir = fullfile(repoRoot, 'backend', 'models');
if ~isfolder(modelsDir), mkdir(modelsDir); end
if ~isfolder(reportsDir), mkdir(reportsDir); end
if ~isfolder(backendModelsDir), mkdir(backendModelsDir); end

stores = create_multidataset_dr_v2_datastores(repoRoot, inputSize, true);
numClasses = numel(stores.classNames);
[networkDefinition, modelFamily, trainingBackend] = localCreateModel(inputSize, numClasses, stores.classNames, stores.classWeights);

validationFrequency = max(1, floor(numel(stores.trainImds.Files) / miniBatchSize));
trainingConfig = struct( ...
    'model_version', modelVersion, ...
    'input_size', inputSize, ...
    'max_epochs', maxEpochs, ...
    'mini_batch_size', miniBatchSize, ...
    'initial_learn_rate', initialLearnRate, ...
    'split_seed', seed, ...
    'training_backend', trainingBackend, ...
    'model_family', modelFamily, ...
    'grade34_oversampling', true, ...
    'device_style_augmentation', stores.deviceAugmentationEnabled, ...
    'training_sources', {{'aptos2019_train', 'idrid_training'}}, ...
    'validation_source', 'aptos2019_validation', ...
    'external_holdout_source', 'idrid_testing' ...
);

fprintf('Training %s candidate...\n', modelVersion);
fprintf('Model family: %s\n', modelFamily);

if trainingBackend == "trainnet"
    options = trainingOptions('adam', ...
        'MiniBatchSize', miniBatchSize, ...
        'MaxEpochs', maxEpochs, ...
        'InitialLearnRate', initialLearnRate, ...
        'LearnRateSchedule', 'piecewise', ...
        'LearnRateDropFactor', 0.2, ...
        'LearnRateDropPeriod', 6, ...
        'L2Regularization', 1e-4, ...
        'Shuffle', 'every-epoch', ...
        'ValidationData', stores.augVal, ...
        'ValidationFrequency', validationFrequency, ...
        'ValidationPatience', 5, ...
        'Verbose', true, ...
        'Plots', 'training-progress', ...
        'Metrics', 'accuracy', ...
        'ExecutionEnvironment', 'auto');

    [trainedNet, info] = trainnet(stores.augTrain, networkDefinition, 'crossentropy', options);
else
    options = trainingOptions('adam', ...
        'MiniBatchSize', miniBatchSize, ...
        'MaxEpochs', maxEpochs, ...
        'InitialLearnRate', initialLearnRate, ...
        'LearnRateSchedule', 'piecewise', ...
        'LearnRateDropFactor', 0.2, ...
        'LearnRateDropPeriod', 6, ...
        'L2Regularization', 1e-4, ...
        'Shuffle', 'every-epoch', ...
        'ValidationData', stores.augVal, ...
        'ValidationFrequency', validationFrequency, ...
        'ValidationPatience', 5, ...
        'Verbose', true, ...
        'Plots', 'training-progress', ...
        'ExecutionEnvironment', 'auto');

    [trainedNet, info] = trainNetwork(stores.augTrain, networkDefinition, options);
end

validationMetricsPath = fullfile(reportsDir, [outputStem '_aptos_validation_metrics.json']);
validationMetrics = evaluate_dr_classifier( ...
    trainedNet, stores.augVal, stores.valImds.Labels, validationMetricsPath, stores.classNames, ...
    'aptos2019_validation_multidataset_dr_v2');

externalMetricsPath = fullfile(reportsDir, [outputStem '_idrid_external_metrics.json']);
externalMetrics = evaluate_dr_classifier( ...
    trainedNet, stores.augExternal, stores.externalImds.Labels, externalMetricsPath, stores.classNames, ...
    'idrid_testing_multidataset_dr_v2');

modelMatPath = fullfile(modelsDir, [outputStem '.mat']);
classNames = stores.classNames;
save(modelMatPath, ...
    'trainedNet', 'info', 'validationMetrics', 'externalMetrics', 'classNames', 'inputSize', ...
    'modelFamily', 'modelVersion', 'trainingConfig');
fprintf('Saved candidate MATLAB model: %s\n', modelMatPath);

summaryPath = fullfile(reportsDir, [outputStem '_summary.md']);
localWriteSummary(summaryPath, trainingConfig, validationMetrics, externalMetrics);

onnxVersionPath = fullfile(backendModelsDir, [outputStem '.onnx']);
try
    export_network_to_onnx(modelMatPath, onnxVersionPath, 'trainedNet');
    fprintf('Saved candidate ONNX model: %s\n', onnxVersionPath);
    fprintf('Current serving model was not replaced. Promote only after metric review.\n');
catch exportErr
    warning('retinascan:OnnxExportSkipped', ...
        'ONNX export skipped: %s', exportErr.message);
end
end

function [networkDefinition, modelFamily, trainingBackend] = localCreateModel(inputSize, numClasses, classNames, classWeights)
if exist('imagePretrainedNetwork', 'file') == 2 && exist('trainnet', 'file') == 2
    try
        networkDefinition = imagePretrainedNetwork("resnet18", NumClasses=numClasses);
        modelFamily = 'ResNet-18 transfer learning via imagePretrainedNetwork/trainnet';
        trainingBackend = "trainnet";
        return;
    catch pretrainedErr
        warning('retinascan:ImagePretrainedNetworkUnavailable', ...
            'Pretrained ResNet-18 unavailable: %s. Trying untrained ResNet-18.', pretrainedErr.message);
    end

    try
        networkDefinition = imagePretrainedNetwork("resnet18", NumClasses=numClasses, Weights="none");
        modelFamily = 'untrained ResNet-18 via imagePretrainedNetwork/trainnet';
        trainingBackend = "trainnet";
        return;
    catch untrainedErr
        warning('retinascan:UntrainedImagePretrainedNetworkUnavailable', ...
            'Untrained imagePretrainedNetwork failed: %s. Trying legacy resnet18 workflow.', untrainedErr.message);
    end
end

if exist('resnet18', 'file') == 2
    try
        net = resnet18('Weights', 'imagenet');
    catch pretrainedErr
        warning('retinascan:LegacyResNet18PretrainedUnavailable', ...
            'Legacy pretrained resnet18 failed: %s. Trying resnet18(''Weights'', ''none'').', pretrainedErr.message);
        net = resnet18('Weights', 'none');
    end

    lgraph = layerGraph(net);
    layers = lgraph.Layers;
    learnableLayerName = localFindLastLayerName(layers, 'FullyConnectedLayer');
    classificationLayerName = localFindLastLayerName(layers, 'ClassificationOutputLayer');

    newFc = fullyConnectedLayer(numClasses, ...
        'Name', 'fc_retinascan', ...
        'WeightLearnRateFactor', 10, ...
        'BiasLearnRateFactor', 10);
    newClassLayer = classificationLayer( ...
        'Name', 'classoutput', ...
        'Classes', categorical(classNames, classNames), ...
        'ClassWeights', classWeights);

    lgraph = replaceLayer(lgraph, learnableLayerName, newFc);
    lgraph = replaceLayer(lgraph, classificationLayerName, newClassLayer);
    networkDefinition = lgraph;
    modelFamily = 'ResNet-18 transfer learning';
    trainingBackend = "trainNetwork";
    return;
end

networkDefinition = localCreateSmallCnn(inputSize, numClasses, classNames, classWeights);
modelFamily = 'small CNN fallback';
trainingBackend = "trainNetwork";
end

function layerName = localFindLastLayerName(layers, classNameFragment)
matches = false(numel(layers), 1);
for idx = 1:numel(layers)
    matches(idx) = contains(string(class(layers(idx))), string(classNameFragment), 'IgnoreCase', true);
end

matchIdx = find(matches, 1, 'last');
assert(~isempty(matchIdx), 'Could not find layer matching %s.', classNameFragment);
layerName = layers(matchIdx).Name;
end

function layers = localCreateSmallCnn(inputSize, numClasses, classNames, classWeights)
layers = [
    imageInputLayer(inputSize, 'Name', 'input', 'Normalization', 'none')

    convolution2dLayer(3, 16, 'Padding', 'same', 'Name', 'conv1')
    batchNormalizationLayer('Name', 'bn1')
    reluLayer('Name', 'relu1')
    maxPooling2dLayer(2, 'Stride', 2, 'Name', 'pool1')

    convolution2dLayer(3, 32, 'Padding', 'same', 'Name', 'conv2')
    batchNormalizationLayer('Name', 'bn2')
    reluLayer('Name', 'relu2')
    maxPooling2dLayer(2, 'Stride', 2, 'Name', 'pool2')

    convolution2dLayer(3, 64, 'Padding', 'same', 'Name', 'conv3')
    batchNormalizationLayer('Name', 'bn3')
    reluLayer('Name', 'relu3')
    globalAveragePooling2dLayer('Name', 'gap')

    fullyConnectedLayer(numClasses, 'Name', 'fc_retinascan')
    softmaxLayer('Name', 'softmax')
    classificationLayer( ...
        'Name', 'classoutput', ...
        'Classes', categorical(classNames, classNames), ...
        'ClassWeights', classWeights)
];
end

function localWriteSummary(summaryPath, trainingConfig, validationMetrics, externalMetrics)
fid = fopen(summaryPath, 'w');
assert(fid > 0, 'Could not open summary file: %s', summaryPath);
cleanup = onCleanup(@() fclose(fid));

fprintf(fid, '# %s\n\n', trainingConfig.model_version);
fprintf(fid, 'Candidate model only. Do not promote until it beats the current baseline on screening metrics and false-negative review.\n\n');
fprintf(fid, '## Training\n\n');
fprintf(fid, '- Sources: APTOS training split + IDRiD training split\n');
fprintf(fid, '- Validation: APTOS fixed validation split\n');
fprintf(fid, '- External holdout: IDRiD testing split\n');
fprintf(fid, '- Grade 3/4 oversampling: %d\n', trainingConfig.grade34_oversampling);
fprintf(fid, '- Device-style augmentation: %d\n\n', trainingConfig.device_style_augmentation);

fprintf(fid, '## APTOS Validation\n\n');
localWriteMetricsTable(fid, validationMetrics);

fprintf(fid, '\n## IDRiD External Holdout\n\n');
localWriteMetricsTable(fid, externalMetrics);

fprintf(fid, '\n## Promotion Checklist\n\n');
fprintf(fid, '- Grade 3 recall improves versus `aptos-baseline-v1`.\n');
fprintf(fid, '- Grade 4 recall improves versus `aptos-baseline-v1`.\n');
fprintf(fid, '- Referable DR sensitivity remains at or above the screening target.\n');
fprintf(fid, '- Specificity loss is clinically acceptable for a rural triage setting.\n');
fprintf(fid, '- False negatives are reviewed manually before deployment.\n');

clear cleanup;
fprintf('Saved candidate summary: %s\n', summaryPath);
end

function localWriteMetricsTable(fid, metrics)
fprintf(fid, '| Metric | Value |\n');
fprintf(fid, '|---|---:|\n');
fprintf(fid, '| Accuracy | %.4f |\n', metrics.accuracy);
fprintf(fid, '| Balanced accuracy | %.4f |\n', metrics.balanced_accuracy);
fprintf(fid, '| Macro F1 | %.4f |\n', metrics.macro_f1);
fprintf(fid, '| Quadratic weighted kappa | %.4f |\n', metrics.quadratic_weighted_kappa);
fprintf(fid, '| Referable DR sensitivity | %.4f |\n', metrics.referable_dr_sensitivity);
fprintf(fid, '| Referable DR specificity | %.4f |\n', metrics.referable_dr_specificity);
fprintf(fid, '| False negatives | %d |\n', metrics.false_negative);
fprintf(fid, '| False positives | %d |\n', metrics.false_positive);
end
