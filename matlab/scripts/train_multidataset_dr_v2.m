function [trainedNet, info, validationMetrics, externalMetrics] = train_multidataset_dr_v2(repoRoot, maxEpochs, runOptions)
%TRAIN_MULTIDATASET_DR_V2 Train an isolated, calibrated research candidate.
if nargin < 1 || isempty(repoRoot)
    repoRoot = fileparts(fileparts(fileparts(mfilename('fullpath'))));
end
if nargin < 2 || isempty(maxEpochs), maxEpochs = 12; end
if nargin < 3, runOptions = struct(); end
smokeTest = localOption(runOptions, 'SmokeTest', false);
batchSize = localOption(runOptions, 'MiniBatchSize', 8);
executionEnvironment = localOption(runOptions, 'ExecutionEnvironment', 'auto');
seed = 20260909;
rng(seed, 'twister');
runId = ['multidataset_dr_v2_' char(datetime('now', 'Format', 'yyyyMMdd_HHmmss'))];
if smokeTest, runId = [runId '_smoke']; end
runDir = fullfile(repoRoot, 'models', 'runs', runId);
assert(~isfolder(runDir), 'Run directory already exists.');
mkdir(runDir);
checkpointDir = fullfile(runDir, 'checkpoints');
mkdir(checkpointDir);
stores = create_multidataset_dr_v2_datastores(repoRoot, [224 224 3], true, ~smokeTest);
classNames = stores.classNames;
inputSize = stores.inputSize;
modelVersion = 'multidataset-dr-v2-candidate';
% Use genuine pretrained weights. A missing support package must stop this run.
network = imagePretrainedNetwork('resnet18', NumClasses=numel(classNames));
inputLayer = network.Layers(1);
assert(strcmp(inputLayer.Normalization, 'zscore'), 'Unexpected pretrained normalization.');
inputLayer.Mean = inputLayer.Mean / 255;
inputLayer.StandardDeviation = inputLayer.StandardDeviation / 255;
network = replaceLayer(network, inputLayer.Name, inputLayer);
if smokeTest
    trainImds = subset(stores.trainImds, localSmallSubset(stores.trainImds.Labels));
    valImds = subset(stores.valImds, localSmallSubset(stores.valImds.Labels));
    trainData = augmentedImageDatastore(inputSize(1:2), trainImds);
    validationData = augmentedImageDatastore(inputSize(1:2), valImds);
    maxEpochs = 1;
else
    trainData = stores.augTrain;
    validationData = stores.augVal;
end
stepsPerEpoch = max(1, ceil(trainData.NumObservations / batchSize));
trainingConfig = struct('model_version', modelVersion, 'run_id', runId, ...
    'seed', seed, 'max_epochs', maxEpochs, 'mini_batch_size', batchSize, ...
    'input_size', inputSize, 'smoke_test', smokeTest, ...
    'preprocessing', 'MATLAB green CLAHE, resize 224, uint8 quantization, RGB 0_1', ...
    'normalization', 'ImageNet mean/std divided by 255 and embedded in input layer', ...
    'class_weights', stores.classWeights, 'grade34_oversampling', 2, ...
    'production_ready', false);
audit = jsondecode(fileread(fullfile(repoRoot, 'reports', 'dr_v2_data_audit.json')));
trainingConfig.manifest_sha256 = audit.manifest_sha256;
writetable(stores.indexTable, fullfile(runDir, 'split_manifest.csv'));
localWriteJson(fullfile(runDir, 'training_config.json'), trainingConfig);
options = trainingOptions('adam', 'MiniBatchSize', batchSize, ...
    'MaxEpochs', maxEpochs, 'InitialLearnRate', 1e-4, ...
    'LearnRateSchedule', 'piecewise', 'LearnRateDropPeriod', 4, ...
    'LearnRateDropFactor', 0.3, 'L2Regularization', 1e-4, ...
    'Shuffle', 'every-epoch', 'ValidationData', validationData, ...
    'ValidationFrequency', stepsPerEpoch, 'ValidationPatience', 4, ...
    'OutputNetwork', 'best-validation', 'ResetInputNormalization', false, ...
    'CheckpointPath', checkpointDir, 'Verbose', true, 'VerboseFrequency', 25, ...
    'Plots', 'none', 'Metrics', 'accuracy', 'ExecutionEnvironment', executionEnvironment);
loss = @(Y,T) crossentropy(Y,T,stores.classWeights,WeightsFormat="CU");
fprintf('Run directory: %s\n', runDir);
[trainedNet, info] = trainnet(trainData, network, loss, options);
modelFamily = 'ImageNet pretrained ResNet-18 with unit-range normalization';
modelPath = fullfile(runDir, 'model.mat');
save(modelPath, 'trainedNet', 'info', 'classNames', 'inputSize', 'modelVersion', 'modelFamily', 'trainingConfig');
validationMetrics = [];
externalMetrics = [];
if ~smokeTest
    [validationMetrics, externalMetrics] = evaluate_dr_v2_candidate(modelPath, stores);
end
onnxPath = fullfile(runDir, 'dr_classifier_v2.onnx');
export_network_to_onnx(modelPath, onnxPath, 'trainedNet');
fprintf('Candidate saved: %s\n', modelPath);
fprintf('Production v1 is unchanged. ONNX/runtime parity and review are required before promotion.\n');
end

function indices = localSmallSubset(labels)
indices = [];
for name = categories(labels)'
    matches = find(labels == name{1}, 2);
    indices = [indices; matches]; %#ok<AGROW>
end
end

function value = localOption(options, name, fallback)
if isfield(options, name), value = options.(name); else, value = fallback; end
end

function localWriteJson(path, value)
fid = fopen(path, 'w');
assert(fid > 0, 'Cannot write run metadata.');
cleanup = onCleanup(@() fclose(fid));
fwrite(fid, jsonencode(value, PrettyPrint=true), 'char');
end
