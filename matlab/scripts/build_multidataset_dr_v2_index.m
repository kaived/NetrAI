function indexTable = build_multidataset_dr_v2_index(repoRoot)
%BUILD_MULTIDATASET_DR_V2_INDEX Load the audited v2 manifest.
if nargin < 1 || isempty(repoRoot)
    repoRoot = fileparts(fileparts(fileparts(mfilename('fullpath'))));
end
indexPath = fullfile(repoRoot, 'data', 'indexes', 'multidataset_dr_v2.csv');
assert(isfile(indexPath), 'Run scripts/prepare_dr_v2.py before v2 training.');
audit = jsondecode(fileread(fullfile(repoRoot,'reports','dr_v2_data_audit.json')));
fid = fopen(indexPath,'rb');
cleanup = onCleanup(@() fclose(fid));
bytes = fread(fid,Inf,'*uint8');
digest = java.security.MessageDigest.getInstance('SHA-256');
digest.update(bytes);
checksum = lower(reshape(dec2hex(typecast(digest.digest(),'uint8'),2)',1,[]));
assert(strcmp(checksum,audit.manifest_sha256),'Manifest changed since its data audit.');
clear cleanup;
indexTable = readtable(indexPath, 'TextType', 'string');
required = ["image_sha256", "split_seed", "sample_weight"];
assert(all(ismember(required, string(indexTable.Properties.VariableNames))), ...
    'Legacy v2 manifest found. Run scripts/prepare_dr_v2.py.');
active = ~startsWith(indexTable.split, "excluded_");
assert(numel(unique(indexTable.image_sha256(active))) == nnz(active), ...
    'Duplicate pixels exist across active partitions.');
assert(all(ismember(["train", "validation", "calibration", "external_holdout", "external_test"], indexTable.split)), ...
    'V2 requires separate training, validation, calibration and test partitions.');
assert(all(isfile(indexTable.image_path)), 'Indexed images are missing.');
fprintf('Audited v2 manifest: %d active, %d excluded images.\n', nnz(active), nnz(~active));
end
