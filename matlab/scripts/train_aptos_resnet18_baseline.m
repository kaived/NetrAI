function [trainedNet, info, metrics] = train_aptos_resnet18_baseline(repoRoot)
%TRAIN_APTOS_RESNET18_BASELINE Train the first APTOS DR classifier baseline.
%
% Usage:
%   cd(fullfile('<repo-root>', 'matlab'))
%   startup
%   [trainedNet, info, metrics] = train_aptos_resnet18_baseline();
%
% Output:
%   models/trained_dr_network.mat
%   backend/models/dr_classifier.onnx, if ONNX export support is installed
%   reports/aptos_baseline_metrics.json

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);
inputSize = [224 224 3];
stores = create_aptos_datastores(repoRoot, inputSize, 0.20);

numClasses = numel(stores.classNames);
[networkDefinition, modelFamily, trainingBackend] = localCreateModel(inputSize, numClasses, stores.classNames, stores.classWeights);

miniBatchSize = 32;
validationFrequency = max(1, floor(numel(stores.trainImds.Files) / miniBatchSize));

fprintf('Training %s baseline on APTOS 2019...\n', modelFamily);
if trainingBackend == "trainnet"
    options = trainingOptions('adam', ...
        'MiniBatchSize', miniBatchSize, ...
        'MaxEpochs', 3, ...
        'InitialLearnRate', 1e-4, ...
        'Shuffle', 'every-epoch', ...
        'ValidationData', stores.augVal, ...
        'ValidationFrequency', validationFrequency, ...
        'Verbose', true, ...
        'Plots', 'training-progress', ...
        'Metrics', 'accuracy', ...
        'ExecutionEnvironment', 'auto');

    [trainedNet, info] = trainnet(stores.augTrain, networkDefinition, 'crossentropy', options);
else
    options = trainingOptions('adam', ...
        'MiniBatchSize', miniBatchSize, ...
        'MaxEpochs', 3, ...
        'InitialLearnRate', 1e-4, ...
        'Shuffle', 'every-epoch', ...
        'ValidationData', stores.augVal, ...
        'ValidationFrequency', validationFrequency, ...
        'Verbose', true, ...
        'Plots', 'training-progress', ...
        'ExecutionEnvironment', 'auto');

    [trainedNet, info] = trainNetwork(stores.augTrain, networkDefinition, options);
end

modelsDir = fullfile(repoRoot, 'models');
reportsDir = fullfile(repoRoot, 'reports');
backendModelsDir = fullfile(repoRoot, 'backend', 'models');
if ~isfolder(modelsDir), mkdir(modelsDir); end
if ~isfolder(reportsDir), mkdir(reportsDir); end
if ~isfolder(backendModelsDir), mkdir(backendModelsDir); end

metricsPath = fullfile(reportsDir, 'aptos_baseline_metrics.json');
metrics = evaluate_dr_classifier(trainedNet, stores.augVal, stores.valImds.Labels, metricsPath, stores.classNames);

modelMatPath = fullfile(modelsDir, 'trained_dr_network.mat');
classNames = stores.classNames;
save(modelMatPath, 'trainedNet', 'info', 'metrics', 'classNames', 'inputSize', 'modelFamily');
fprintf('Saved MATLAB model: %s\n', modelMatPath);

onnxPath = fullfile(backendModelsDir, 'dr_classifier.onnx');
try
    export_network_to_onnx(modelMatPath, onnxPath, 'trainedNet');
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
