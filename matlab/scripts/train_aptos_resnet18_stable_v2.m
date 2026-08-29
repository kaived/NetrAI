function [trainedNet, info, metrics] = train_aptos_resnet18_stable_v2(repoRoot)
%TRAIN_APTOS_RESNET18_STABLE_V2 Train a stronger APTOS ResNet-18 model.
%
% This keeps the first baseline intact and creates:
%   data/splits/aptos2019_split_v1.csv
%   models/aptos_resnet18_stable_v2.mat
%   reports/aptos_resnet18_stable_v2_metrics.json
%   reports/aptos_resnet18_stable_v2_summary.md
%   backend/models/dr_classifier_aptos_resnet18_stable_v2.onnx
%   backend/models/dr_classifier.onnx
%
% Usage:
%   cd(fullfile('<repo-root>', 'matlab'))
%   startup
%   [trainedNet, info, metrics] = train_aptos_resnet18_stable_v2();

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);
modelVersion = 'aptos-resnet18-stable-v2';
outputStem = 'aptos_resnet18_stable_v2';
inputSize = [224 224 3];
validationRatio = 0.20;
seed = 20260828;
maxEpochs = 12;
miniBatchSize = 32;
initialLearnRate = 1e-4;

rng(seed, 'twister');

modelsDir = fullfile(repoRoot, 'models');
reportsDir = fullfile(repoRoot, 'reports');
backendModelsDir = fullfile(repoRoot, 'backend', 'models');
if ~isfolder(modelsDir), mkdir(modelsDir); end
if ~isfolder(reportsDir), mkdir(reportsDir); end
if ~isfolder(backendModelsDir), mkdir(backendModelsDir); end

splitPath = fullfile(repoRoot, 'data', 'splits', 'aptos2019_split_v1.csv');
create_aptos_fixed_split(repoRoot, validationRatio, seed, 'aptos2019_split_v1');
stores = create_aptos_datastores(repoRoot, inputSize, validationRatio, splitPath, true);

numClasses = numel(stores.classNames);
[networkDefinition, modelFamily, trainingBackend] = localCreateModel( ...
    inputSize, numClasses, stores.classNames, stores.classWeights);

validationFrequency = max(1, floor(numel(stores.trainImds.Files) / miniBatchSize));
trainingConfig = struct( ...
    'model_version', modelVersion, ...
    'input_size', inputSize, ...
    'validation_ratio', validationRatio, ...
    'split_seed', seed, ...
    'max_epochs', maxEpochs, ...
    'mini_batch_size', miniBatchSize, ...
    'initial_learn_rate', initialLearnRate, ...
    'balanced_training', stores.balanceTraining, ...
    'split_source', stores.splitSource, ...
    'training_backend', trainingBackend, ...
    'model_family', modelFamily ...
);

fprintf('Training %s on fixed APTOS split...\n', modelFamily);
fprintf('Model version: %s\n', modelVersion);

if trainingBackend == "trainnet"
    options = trainingOptions('adam', ...
        'MiniBatchSize', miniBatchSize, ...
        'MaxEpochs', maxEpochs, ...
        'InitialLearnRate', initialLearnRate, ...
        'LearnRateSchedule', 'piecewise', ...
        'LearnRateDropFactor', 0.2, ...
        'LearnRateDropPeriod', 5, ...
        'L2Regularization', 1e-4, ...
        'Shuffle', 'every-epoch', ...
        'ValidationData', stores.augVal, ...
        'ValidationFrequency', validationFrequency, ...
        'ValidationPatience', 4, ...
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
        'LearnRateDropPeriod', 5, ...
        'L2Regularization', 1e-4, ...
        'Shuffle', 'every-epoch', ...
        'ValidationData', stores.augVal, ...
        'ValidationFrequency', validationFrequency, ...
        'ValidationPatience', 4, ...
        'Verbose', true, ...
        'Plots', 'training-progress', ...
        'ExecutionEnvironment', 'auto');

    [trainedNet, info] = trainNetwork(stores.augTrain, networkDefinition, options);
end

metricsPath = fullfile(reportsDir, [outputStem '_metrics.json']);
metrics = evaluate_dr_classifier( ...
    trainedNet, stores.augVal, stores.valImds.Labels, metricsPath, stores.classNames, ...
    'aptos2019_split_v1_validation');

modelMatPath = fullfile(modelsDir, [outputStem '.mat']);
classNames = stores.classNames;
save(modelMatPath, ...
    'trainedNet', 'info', 'metrics', 'classNames', 'inputSize', ...
    'modelFamily', 'modelVersion', 'trainingConfig', 'splitPath');
fprintf('Saved MATLAB model: %s\n', modelMatPath);

summaryPath = fullfile(reportsDir, [outputStem '_summary.md']);
localWriteSummary(summaryPath, modelVersion, modelFamily, trainingConfig, metrics);

onnxVersionPath = fullfile(backendModelsDir, [outputStem '.onnx']);
onnxServingPath = fullfile(backendModelsDir, 'dr_classifier.onnx');
try
    export_network_to_onnx(modelMatPath, onnxVersionPath, 'trainedNet');
    copyfile(onnxVersionPath, onnxServingPath);
    fprintf('Updated backend serving model: %s\n', onnxServingPath);
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
            'Pretrained ResNet-18 support package is unavailable: %s. Trying untrained ResNet-18.', pretrainedErr.message);
    end

    try
        networkDefinition = imagePretrainedNetwork("resnet18", NumClasses=numClasses, Weights="none");
        modelFamily = 'untrained ResNet-18 via imagePretrainedNetwork/trainnet';
        trainingBackend = "trainnet";
        return;
    catch untrainedErr
        warning('retinascan:UntrainedImagePretrainedNetworkUnavailable', ...
            'Untrained imagePretrainedNetwork("resnet18") failed: %s. Trying legacy resnet18 workflow.', untrainedErr.message);
    end
end

if exist('resnet18', 'file') == 2
    try
        net = resnet18('Weights', 'imagenet');
    catch pretrainedErr
        warning('retinascan:LegacyResNet18PretrainedUnavailable', ...
            'Legacy pretrained resnet18 failed: %s. Trying resnet18(''Weights'', ''none'').', pretrainedErr.message);
        try
            net = resnet18('Weights', 'none');
        catch untrainedErr
            warning('retinascan:LegacyResNet18UntrainedUnavailable', ...
                'Legacy untrained resnet18 failed: %s. Using small CNN fallback.', untrainedErr.message);
            [networkDefinition, modelFamily, trainingBackend] = localCreateSmallCnn(inputSize, numClasses, classNames, classWeights);
            return;
        end
    end

    try
        if isa(net, 'nnet.cnn.LayerGraph')
            lgraph = net;
        else
            lgraph = layerGraph(net);
        end
    catch graphErr
        warning('retinascan:LegacyResNet18GraphFailed', ...
            'Could not convert resnet18 output of class %s to layerGraph: %s. Using small CNN fallback.', ...
            class(net), graphErr.message);
        [networkDefinition, modelFamily, trainingBackend] = localCreateSmallCnn(inputSize, numClasses, classNames, classWeights);
        return;
    end

    layers = lgraph.Layers;

    learnableLayerName = localFindLastLayerName(layers, 'nnet.cnn.layer.FullyConnectedLayer');
    classificationLayerName = localFindLastLayerName(layers, 'nnet.cnn.layer.ClassificationOutputLayer');

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

warning('retinascan:ResNet18Unavailable', ...
    'resnet18 was not found. Install the ResNet-18 support package for transfer learning. Using small CNN fallback.');

[networkDefinition, modelFamily, trainingBackend] = localCreateSmallCnn(inputSize, numClasses, classNames, classWeights);
end

function [networkDefinition, modelFamily, trainingBackend] = localCreateSmallCnn(inputSize, numClasses, classNames, classWeights)
networkDefinition = [
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
modelFamily = 'small CNN fallback';
trainingBackend = "trainNetwork";
end

function layerName = localFindLastLayerName(layers, className)
matches = false(numel(layers), 1);
for idx = 1:numel(layers)
    matches(idx) = isa(layers(idx), className);
end

matchIdx = find(matches, 1, 'last');
if isempty(matchIdx)
    error('retinascan:LayerNotFound', 'Could not find layer of class %s.', className);
end

layerName = layers(matchIdx).Name;
end

function localWriteSummary(summaryPath, modelVersion, modelFamily, trainingConfig, metrics)
fid = fopen(summaryPath, 'w');
assert(fid > 0, 'Could not open summary file for writing: %s', summaryPath);
cleanup = onCleanup(@() fclose(fid));

fprintf(fid, '# %s\n\n', modelVersion);
fprintf(fid, '## Model\n\n');
fprintf(fid, '- Family: %s\n', modelFamily);
fprintf(fid, '- Input size: %dx%dx%d\n', trainingConfig.input_size);
fprintf(fid, '- Epochs: %d\n', trainingConfig.max_epochs);
fprintf(fid, '- Mini-batch size: %d\n', trainingConfig.mini_batch_size);
fprintf(fid, '- Fixed split: %s\n', trainingConfig.split_source);
fprintf(fid, '- Balanced training: %d\n\n', trainingConfig.balanced_training);

fprintf(fid, '## Validation Metrics\n\n');
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
fprintf(fid, '| False positives | %d |\n', metrics.false_positive);

if ~isnan(metrics.recommended_referable_threshold)
    fprintf(fid, '\nRecommended referable threshold: %.3f\n', metrics.recommended_referable_threshold);
end

clear cleanup;
fprintf('Saved model summary: %s\n', summaryPath);
end
