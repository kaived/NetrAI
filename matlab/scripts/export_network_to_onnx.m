function export_network_to_onnx(networkMatPath, outputOnnxPath, variableName)
%EXPORT_NETWORK_TO_ONNX Export a trained MATLAB network to ONNX for backend serving.
%
% Usage:
%   export_network_to_onnx('models/trained_dr_network.mat', ...
%       '../backend/models/dr_classifier.onnx')
%
% Optional:
%   export_network_to_onnx('models/trained_dr_network.mat', ...
%       '../backend/models/dr_classifier.onnx', 'trainedNet')

if nargin < 3
    variableName = "";
end

repoRoot = localRepoRoot();
networkMatPath = localResolveExistingFile(networkMatPath, repoRoot);
outputOnnxPath = localResolveOutputPath(outputOnnxPath, repoRoot);

if ~isfile(networkMatPath)
    error('retinascan:ModelNotFound', 'Network MAT file not found: %s', networkMatPath);
end

if exist('exportONNXNetwork', 'file') ~= 2
    error('retinascan:MissingOnnxExporter', ...
        'exportONNXNetwork is unavailable. Install the Deep Learning Toolbox Converter for ONNX Model Format support package.');
end

modelData = load(networkMatPath);

if strlength(string(variableName)) > 0
    assert(isfield(modelData, variableName), 'Variable not found in MAT file: %s', variableName);
    net = modelData.(variableName);
else
    net = localFindNetwork(modelData);
end

outputDir = fileparts(outputOnnxPath);
if ~isempty(outputDir) && ~isfolder(outputDir)
    mkdir(outputDir);
end

exportONNXNetwork(net, outputOnnxPath);
fprintf('Exported ONNX model: %s\n', outputOnnxPath);
end

function repoRoot = localRepoRoot()
scriptDir = fileparts(mfilename('fullpath'));
repoRoot = char(java.io.File(fullfile(scriptDir, '..', '..')).getCanonicalPath());
end

function resolvedPath = localResolveExistingFile(inputPath, repoRoot)
pathText = char(string(inputPath));
if isfile(pathText)
    resolvedPath = pathText;
    return;
end

repoRelativePath = fullfile(repoRoot, pathText);
if isfile(repoRelativePath)
    resolvedPath = repoRelativePath;
    return;
end

resolvedPath = pathText;
end

function resolvedPath = localResolveOutputPath(inputPath, repoRoot)
pathText = char(string(inputPath));
if localIsAbsolutePath(pathText)
    resolvedPath = pathText;
    return;
end

currentDirPath = fullfile(pwd, pathText);
repoRelativePath = fullfile(repoRoot, pathText);

currentParent = fileparts(currentDirPath);
repoParent = fileparts(repoRelativePath);

if ~isempty(currentParent) && isfolder(currentParent)
    resolvedPath = currentDirPath;
elseif ~isempty(repoParent) && isfolder(repoParent)
    resolvedPath = repoRelativePath;
else
    resolvedPath = repoRelativePath;
end
end

function isAbsolute = localIsAbsolutePath(pathText)
isAbsolute = ~isempty(regexp(pathText, '^[A-Za-z]:[\\/]|^[\\/]', 'once'));
end

function net = localFindNetwork(modelData)
names = fieldnames(modelData);
preferredNames = {'trainedNet', 'net', 'network', 'drNet'};

for idx = 1:numel(preferredNames)
    name = preferredNames{idx};
    if isfield(modelData, name)
        net = modelData.(name);
        return;
    end
end

for idx = 1:numel(names)
    candidate = modelData.(names{idx});
    className = class(candidate);
    if contains(className, 'SeriesNetwork') || ...
            contains(className, 'DAGNetwork') || ...
            contains(className, 'dlnetwork')
        net = candidate;
        return;
    end
end

error('retinascan:NetworkVariableNotFound', ...
    'No network variable found. Pass the variable name explicitly.');
end
