from django.db import models
from django.core.validators import MaxLengthValidator

class Faculty_Teacher(models.Model):
    TeacherID = models.CharField(
        max_length=50,
        primary_key=True,
        validators=[MaxLengthValidator(50)],
        verbose_name="Teacher ID"
    )
    FullName = models.CharField(max_length=255)
    Designation = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "faculty_teacher"
        managed = False

    def __str__(self):
        return self.FullName