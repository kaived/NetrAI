function startup()
%STARTUP Add the RetinaScan AI MATLAB package to the path.

rootDir = fileparts(mfilename('fullpath'));
addpath(rootDir);

fprintf('RetinaScan AI MATLAB path initialized: %s\n', rootDir);
end
