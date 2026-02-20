from django.db import models

class Feedback_SubmissionLog(models.Model):
    LogID = models.AutoField(primary_key=True)
    ResponseID = models.ForeignKey(
        "feedback_app.Feedback_Response",
        db_column="ResponseID",
        on_delete=models.CASCADE,
    )
    EnrollmentNo = models.CharField(max_length=50, db_column="EnrollmentNo")
    AllocationID = models.ForeignKey(
        "feedback_app.Academic_Allocation",
        db_column="AllocationID",
        on_delete=models.CASCADE,
    )
    Timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_submissionlog"
        managed = False

    def __str__(self):
        return f"Log {self.LogID}: {self.EnrollmentNo} @ {self.Timestamp}"