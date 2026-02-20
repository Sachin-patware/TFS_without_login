from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, MaxLengthValidator

RATING_MIN = 1
RATING_MAX = 5

class Feedback_Response(models.Model):
    ResponseID = models.AutoField(primary_key=True)
    AllocationID = models.ForeignKey(
        "feedback_app.Academic_Allocation",
        db_column="AllocationID",
        on_delete=models.CASCADE,
    )

    Q1_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q2_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q3_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q4_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q5_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q6_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q7_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q8_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q9_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])
    Q10_Rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(RATING_MIN), MaxValueValidator(RATING_MAX)])

    Comments = models.CharField(max_length=20, blank=True, null=True, validators=[MaxLengthValidator(20)])

    class Meta:
        db_table = "feedback_response"
        managed = False

    def __str__(self):
        return f"Response {self.ResponseID} for Allocation {self.AllocationID_id}"