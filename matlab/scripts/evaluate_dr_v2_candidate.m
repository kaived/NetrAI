function [validationMetrics, externalMetrics] = evaluate_dr_v2_candidate(modelPath, stores)
%EVALUATE_DR_V2_CANDIDATE Freeze calibration, then evaluate each dataset separately.
model = load(modelPath);
assert(~model.trainingConfig.smoke_test, 'Smoke-test models are not evaluation candidates.');
runDir = fileparts(modelPath);
batchSize = model.trainingConfig.mini_batch_size;
calibrationPath = fullfile(runDir,'calibration.json');
if isfile(calibrationPath)
    calibration = jsondecode(fileread(calibrationPath));
else
    scores = localPredict(model.trainedNet,stores.augCalibration,batchSize);
    calibration = calibrate_dr_v2(scores,stores.calibrationRows.label);
    localWriteJson(calibrationPath,calibration);
end
validationMetrics = struct(); externalMetrics = struct();
datasets = ["aptos2019", "idrid", "idrid", "messidor2"];
partitions = ["validation", "validation", "external_holdout", "external_test"];
for k = 1:numel(datasets)
    rows = stores.indexTable(stores.indexTable.source_dataset==datasets(k) & stores.indexTable.split==partitions(k),:);
    imds = imageDatastore(cellstr(rows.image_path));
    imds.ReadFcn = @(file) im2single(im2uint8(retinascan.io.readAndPreprocessForNetwork(file,model.inputSize)));
    data = augmentedImageDatastore(model.inputSize(1:2),imds);
    started = tic;
    scores = localPredict(model.trainedNet,data,batchSize);
    seconds = toc(started);
    probabilities = apply_dr_v2_temperature(scores,calibration.temperature);
    metrics = score_dr_v2_probabilities(probabilities,rows.label,calibration.referable_threshold);
    metrics.dataset = datasets(k);
    metrics.partition = partitions(k);
    metrics.total_inference_seconds = seconds;
    metrics.mean_seconds_per_image = seconds/height(rows);
    metrics.raw_metrics = score_dr_v2_probabilities(scores,rows.label,0.5);
    name = datasets(k) + "_" + partitions(k);
    localWriteJson(fullfile(runDir,name+"_metrics.json"),metrics);
    [confidence,predicted] = max(probabilities,[],2);
    predicted = predicted-1;
    review = rows(:,{'image_id','image_path','label','source_dataset'});
    review.predicted_grade = predicted;
    review.confidence = confidence;
    review.referable_probability = sum(probabilities(:,3:5),2);
    review.predicted_referable = review.referable_probability>=calibration.referable_threshold | predicted>=2;
    review.false_negative = rows.label>=2 & ~review.predicted_referable;
    review.grade34_undergraded = rows.label>=3 & predicted<rows.label;
    review.manual_review = confidence<0.7 | abs(review.referable_probability-calibration.referable_threshold)<0.05;
    for grade = 0:4, review.("p_grade_"+grade) = probabilities(:,grade+1); end
    writetable(review,fullfile(runDir,name+"_predictions.csv"));
    fprintf('%s: sensitivity %.3f, specificity %.3f, Grade 3 recall %.3f, Grade 4 recall %.3f\n', ...
        name,metrics.referable_dr_sensitivity,metrics.referable_dr_specificity,metrics.class_recall(4),metrics.class_recall(5));
    if k<=2, validationMetrics.(datasets(k)) = metrics; else, externalMetrics.(datasets(k)) = metrics; end
end
gate = struct('production_ready',false, ...
    'research_point_targets_met',externalMetrics.messidor2.meets_point_targets && externalMetrics.idrid.meets_point_targets, ...
    'requires',{{'Matched v1 comparison','False-negative review','End-to-end quality-gate evaluation', ...
    'MATLAB/ONNX/Android preprocessing and prediction parity','Target-phone latency and memory testing', ...
    'Independent prospective fundus-camera pilot with expert grading'}}, ...
    'note','Dataset results alone do not establish clinical or rural-field reliability.');
localWriteJson(fullfile(runDir,'promotion_gate.json'),gate);
end

function scores = localPredict(net,data,batchSize)
scores = minibatchpredict(net,data,'MiniBatchSize',batchSize);
if isa(scores,'dlarray'), scores = extractdata(scores); end
scores = double(gather(scores));
assert(size(scores,2)==5 && size(scores,1)==data.NumObservations,'Unexpected score layout.');
scores = apply_dr_v2_temperature(scores,1);
end

function localWriteJson(path,value)
fid = fopen(path,'w'); assert(fid>0,'Cannot write evaluation artifact.');
cleanup = onCleanup(@() fclose(fid));
fwrite(fid,jsonencode(value,PrettyPrint=true),'char');
end
