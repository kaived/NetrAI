function scenarioTable = run_district_workflow_scenarios(repoRoot)
%RUN_DISTRICT_WORKFLOW_SCENARIOS Save district screening scenario estimates.

if nargin < 1 || isempty(repoRoot) || strlength(string(repoRoot)) == 0
    scriptDir = fileparts(mfilename('fullpath'));
    repoRoot = fileparts(fileparts(scriptDir));
end

repoRoot = char(repoRoot);

scenarioNames = ["PHC pilot", "District standard", "High-volume camp", "Low-connectivity rural block"]';
cameras = [2; 4; 8; 3];
captureMinutes = [4.0; 3.0; 2.5; 3.5];
positiveRate = [0.18; 0.18; 0.22; 0.18];
reviewSeconds = [45; 30; 30; 45];
targetPatients = [25000; 100000; 150000; 80000];
workingDays = [220; 250; 260; 230];
offlineHoursPerDay = [1.0; 0.5; 0.25; 4.0];
syncBandwidthMbps = [4; 8; 12; 1.5];

rows = table(scenarioNames, cameras, captureMinutes, positiveRate, reviewSeconds, targetPatients, workingDays, offlineHoursPerDay, syncBandwidthMbps, ...
    'VariableNames', {'scenario', 'cameras', 'capture_minutes_per_patient', 'expected_positive_rate', 'review_seconds_per_positive', 'patients_per_year_target', 'working_days_per_year', 'offline_hours_per_day', 'sync_bandwidth_mbps'});

dailyTarget = zeros(height(rows), 1);
dailyCaptureCapacity = zeros(height(rows), 1);
expectedPositiveReviews = zeros(height(rows), 1);
reviewHoursPerDay = zeros(height(rows), 1);
offlineCasesPerDay = zeros(height(rows), 1);
estimatedSyncMinutesPerDay = zeros(height(rows), 1);
bottleneck = strings(height(rows), 1);

for idx = 1:height(rows)
    cfg = struct( ...
        'patients_per_year_target', rows.patients_per_year_target(idx), ...
        'working_days_per_year', rows.working_days_per_year(idx), ...
        'cameras', rows.cameras(idx), ...
        'capture_minutes_per_patient', rows.capture_minutes_per_patient(idx), ...
        'review_seconds_per_positive', rows.review_seconds_per_positive(idx), ...
        'expected_positive_rate', rows.expected_positive_rate(idx) ...
    );

    simulation = retinascan.m5.simulateThroughput(cfg);
    dailyTarget(idx) = simulation.dailyTargetPatients;
    dailyCaptureCapacity(idx) = simulation.dailyCaptureCapacity;
    expectedPositiveReviews(idx) = simulation.expectedPositiveReviewsPerDay;
    reviewHoursPerDay(idx) = simulation.ophthalmologistReviewHoursPerDay;
    bottleneck(idx) = string(simulation.bottleneck);

    offlineFraction = min(rows.offline_hours_per_day(idx) / 8.0, 1.0);
    offlineCasesPerDay(idx) = dailyTarget(idx) * offlineFraction;
    estimatedPayloadMb = offlineCasesPerDay(idx) * 3.0;
    estimatedSyncMinutesPerDay(idx) = (estimatedPayloadMb * 8) / max(rows.sync_bandwidth_mbps(idx), eps) / 60;
end

scenarioTable = [rows, table(dailyTarget, dailyCaptureCapacity, expectedPositiveReviews, reviewHoursPerDay, offlineCasesPerDay, estimatedSyncMinutesPerDay, bottleneck)];

reportsDir = fullfile(repoRoot, 'reports');
if ~isfolder(reportsDir)
    mkdir(reportsDir);
end

csvPath = fullfile(reportsDir, 'district_workflow_scenarios.csv');
mdPath = fullfile(reportsDir, 'district_workflow_scenarios.md');
writetable(scenarioTable, csvPath);
localWriteMarkdown(mdPath, scenarioTable);

fprintf('Saved district workflow scenario CSV: %s\n', csvPath);
fprintf('Saved district workflow scenario summary: %s\n', mdPath);
end

function localWriteMarkdown(mdPath, scenarioTable)
fid = fopen(mdPath, 'w');
assert(fid > 0, 'Could not open Markdown report: %s', mdPath);
cleanup = onCleanup(@() fclose(fid));

fprintf(fid, '# District Workflow Simulation Scenarios\n\n');
fprintf(fid, 'These estimates support the Simulink district screening model. Values are planning assumptions, not clinical validation results.\n\n');
fprintf(fid, '| Scenario | Cameras | Patients/year | Daily target | Capture capacity/day | Review hours/day | Offline cases/day | Sync minutes/day | Bottleneck |\n');
fprintf(fid, '|---|---:|---:|---:|---:|---:|---:|---:|---|\n');

for idx = 1:height(scenarioTable)
    fprintf(fid, '| %s | %d | %d | %.1f | %.1f | %.2f | %.1f | %.1f | %s |\n', ...
        scenarioTable.scenario(idx), ...
        scenarioTable.cameras(idx), ...
        scenarioTable.patients_per_year_target(idx), ...
        scenarioTable.dailyTarget(idx), ...
        scenarioTable.dailyCaptureCapacity(idx), ...
        scenarioTable.reviewHoursPerDay(idx), ...
        scenarioTable.offlineCasesPerDay(idx), ...
        scenarioTable.estimatedSyncMinutesPerDay(idx), ...
        scenarioTable.bottleneck(idx));
end

clear cleanup;
end
