from django.db import models

class Feedback_SubmissionLog(models.Model):
    LogID = models.AutoField(primary_key=True)
    Timestamp = models.DateTimeField(auto_now_add=True)
    AllocationID = models.ForeignKey(
        "feedback_app.Academic_Allocation",
        db_column="AllocationID",
        on_delete=models.CASCADE,
    )
    ResponseID = models.ForeignKey(
        "feedback_app.Feedback_Response",
        db_column="ResponseID",
        on_delete=models.CASCADE,
    )
    EnrollmentNo = models.CharField(max_length=50)

    class Meta:
        db_table = "feedback_submissionlog"
        managed = False
