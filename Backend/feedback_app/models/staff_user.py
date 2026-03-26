from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


class StaffUserManager(BaseUserManager):
    """Custom manager for StaffUser"""

    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError("Username is required")
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_first_login', False)
        return self.create_user(username, password, **extra_fields)


class StaffUser(AbstractBaseUser):
    """
    Minimal user model for Admin/HOD login.
    Fields: username, password, role, department, branches, is_active, is_first_login
    """
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('hod', 'HOD'),
    )

    username = models.CharField(max_length=150, unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    department = models.CharField(max_length=100, blank=True, null=True)
    branches = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    is_first_login = models.BooleanField(default=True)

    objects = StaffUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
