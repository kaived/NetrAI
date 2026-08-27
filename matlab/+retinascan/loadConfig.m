function cfg = loadConfig(configPath)
%LOADCONFIG Read pipeline configuration from JSON.

if nargin < 1 || isempty(configPath)
    error('retinascan:MissingConfig', 'A config path is required.');
end

if ~isfile(configPath)
    error('retinascan:ConfigNotFound', 'Config file not found: %s', configPath);
end

cfg = jsondecode(fileread(configPath));
end
