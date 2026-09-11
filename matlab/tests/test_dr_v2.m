function tests = test_dr_v2
tests = functiontests(localfunctions);
end

function testPerfectPredictions(testCase)
scores = ones(5)*0.02 + eye(5)*0.9;
metrics = score_dr_v2_probabilities(scores,(0:4)',0.5);
verifyEqual(testCase,metrics.accuracy,1);
verifyEqual(testCase,metrics.referable_dr_sensitivity,1);
verifyEqual(testCase,metrics.referable_dr_specificity,1);
verifyEqual(testCase,metrics.class_recall,ones(5,1));
verifyEqual(testCase,metrics.confusion_matrix,eye(5));
verifyEqual(testCase,metrics.quadratic_weighted_kappa,1);
verifyGreaterThan(testCase,metrics.sensitivity_ci95(1),0);
verifyLessThan(testCase,metrics.sensitivity_ci95(1),1);
end

function testReferralUsesProbabilityAndPreservesGradeTwo(testCase)
scores = [0.4 0.15 0.2 0.15 0.1; 0.1 0.1 0.5 0.2 0.1; 0.95 0.02 0.01 0.01 0.01];
metrics = score_dr_v2_probabilities(scores,[2;2;0],0.4);
verifyEqual(testCase,metrics.true_positive,2);
metrics = score_dr_v2_probabilities(scores,[2;2;0],0.99);
verifyEqual(testCase,metrics.true_positive,1);
end

function testTemperaturePreservesOrderAndNormalizes(testCase)
scores = [0.5 0.2 0.1 0.1 0.1; 0.1 0.1 0.1 0.2 0.5];
scaled = apply_dr_v2_temperature(scores,2);
verifyEqual(testCase,sum(scaled,2),ones(2,1),'AbsTol',1e-12);
[~,before] = max(scores,[],2); [~,after] = max(scaled,[],2);
verifyEqual(testCase,before,after);
verifyLessThan(testCase,max(scaled,[],2),max(scores,[],2));
end

function testCalibrationReportsUnmetTargets(testCase)
scores = repmat([0.7 0.1 0.1 0.05 0.05],10,1);
calibration = calibrate_dr_v2(scores,[0;1;2;3;4;0;1;2;3;4]);
verifyFalse(testCase,calibration.calibration_targets_met);
verifyEqual(testCase,calibration.fit_partition,'calibration');
verifyEqual(testCase,calibration.calibrated_metrics.false_negative,0);
verifyEqual(testCase,calibration.calibrated_metrics.referable_dr_specificity,0);
end

function testCalibrationDoesNotChangeInput(testCase)
scores = ones(5)*0.02 + eye(5)*0.9;
before = scores;
calibration = calibrate_dr_v2(scores,(0:4)');
verifyEqual(testCase,scores,before);
verifyTrue(testCase,calibration.calibration_targets_met);
end
