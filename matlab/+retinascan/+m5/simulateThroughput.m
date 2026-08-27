function simulation = simulateThroughput(cfg)
%SIMULATETHROUGHPUT Estimate district-scale screening throughput.

targetPatients = localGet(cfg, 'patients_per_year_target', 100000);
workingDays = localGet(cfg, 'working_days_per_year', 250);
cameras = localGet(cfg, 'cameras', 4);
captureMinutes = localGet(cfg, 'capture_minutes_per_patient', 3.0);
reviewSeconds = localGet(cfg, 'ophthalmologist_review_seconds_per_positive', 30.0);
positiveRate = localGet(cfg, 'expected_positive_rate', 0.18);

dailyTarget = targetPatients / workingDays;
dailyCaptureCapacity = cameras * (8 * 60) / captureMinutes;
dailyPositiveReviews = dailyTarget * positiveRate;
reviewHoursPerDay = dailyPositiveReviews * reviewSeconds / 3600;

if dailyCaptureCapacity < dailyTarget
    bottleneck = 'capture_capacity';
else
    bottleneck = 'ophthalmologist_review_or_operations';
end

simulation = struct( ...
    'targetPatientsPerYear', targetPatients, ...
    'dailyTargetPatients', dailyTarget, ...
    'dailyCaptureCapacity', dailyCaptureCapacity, ...
    'expectedPositiveReviewsPerDay', dailyPositiveReviews, ...
    'ophthalmologistReviewHoursPerDay', reviewHoursPerDay, ...
    'bottleneck', bottleneck ...
);
end

function value = localGet(cfg, fieldName, defaultValue)
if isstruct(cfg) && isfield(cfg, fieldName)
    value = cfg.(fieldName);
else
    value = defaultValue;
end
end
