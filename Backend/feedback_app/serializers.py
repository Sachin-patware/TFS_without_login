from rest_framework import serializers
from django.utils import timezone
from django import forms
from datetime import date


class LoginSerializer(forms.Form):
    REQUIRED_MSG = "All fields are required"
     
    branch = forms.CharField(
        required=True,
        error_messages={'required': REQUIRED_MSG}
    )
    year = forms.IntegerField(
        required=True,
        error_messages={'required': REQUIRED_MSG}
    )
    semester = forms.IntegerField(
        required=True,
        error_messages={'required': REQUIRED_MSG}
    )
    section = forms.IntegerField(
        required=True,
        error_messages={'required': REQUIRED_MSG}
    )

    def clean_branch(self):
        branch = self.cleaned_data.get('branch', '').upper().strip()
        valid_branches = ['CS', 'IT', 'DS', 'AIML']
        if branch not in valid_branches:
            raise forms.ValidationError(f"Invalid branch. Must be one of: {', '.join(valid_branches)}")
        return branch
class FeedbackSerializer(forms.Form):

    subject_code = forms.CharField(
        required=True,
        max_length=50,
        error_messages={
            'required': 'subject_code is required',
            'max_length': 'subject_code must be at most 50 characters'
        }
    )

    allocation_id = forms.IntegerField(
        required=True,
        error_messages={
            'required': 'allocation_id is required',
            'invalid': 'allocation_id must be an integer'
        }
    )

    q1 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q1 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q2 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q2 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q3 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q3 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q4 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q4 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q5 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q5 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q6 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q6 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q7 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q7 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q8 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q8 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q9 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q9 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})
    q10 = forms.IntegerField(min_value=1, max_value=5, required=True,
        error_messages={"required": "q10 is required", "min_value": "rating must be 1–5", "max_value": "rating must be 1–5"})

    comments = forms.CharField(required=False, max_length=500)

    # --- Cleaners ---
    def clean_subject_code(self):
        value = self.cleaned_data.get("subject_code")
        return value.upper().strip() if value else value

    def clean_comments(self):
        value = self.cleaned_data.get("comments")
        return value.strip() if value else value

    def clean(self):
        return super().clean()
