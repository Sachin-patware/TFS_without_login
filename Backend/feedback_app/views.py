from django.http import JsonResponse
from django.db import connections
from django.db.utils import DatabaseError
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ValidationError
from django.db import transaction
from django.core.signing import Signer, BadSignature
import json
import random
import string
from feedback_app.serializers import LoginSerializer, FeedbackSerializer, AcademicSubjectSerializer, FacultyTeacherSerializer, AcademicAllocationSerializer
from feedback_app.models.feedback_response import Feedback_Response
from feedback_app.models.feedback_submissionlog import Feedback_SubmissionLog
from feedback_app.models.academic_allocation import Academic_Allocation
from feedback_app.models.faculty_teacher import Faculty_Teacher
from django.db.models import Avg, F, Count
from functools import wraps
from feedback_app.auth import generate_jwt, jwt_required, jwt_admin_required

# In-memory store for student access token (resets on server restart)
CURRENT_ACCESS_TOKEN = "AITR0827"

# LEGACY DECORATORS REMOVED (Replaced by feedback_app.auth)

# login api 
@csrf_exempt
@require_POST
def login(request):
    
    # robust body parsing
    content_type = request.META.get('CONTENT_TYPE', '') or request.META.get('HTTP_CONTENT_TYPE', '')
    raw_body = request.body or b''
    payload = {}

    if raw_body:
        try:
            s = raw_body.decode('utf-8').strip()
        except Exception:
            s = ''
        try_json = False
        if 'application/json' in content_type:
            try_json = True
        else:
            # if body looks like JSON even without proper header, attempt parse
            if s.startswith('{') or s.startswith('['):
                try_json = True

        if try_json:
            try:
                payload = json.loads(s or '{}')
            except Exception:
                return JsonResponse({'status': 'error', 'error': 'invalid JSON'}, status=400)
        else:
            # form / urlencoded / multipart parse via Django request.POST
            payload = request.POST.dict()
    else:
        # No body: accept form-urlencoded (if client used GET) or query params
        payload = request.POST.dict() or request.GET.dict()

    # normalize keys from various client names
    branch_raw = payload.get('branch') or payload.get('Branch')
    year_raw = payload.get('year') or payload.get('Year')
    semester_raw = payload.get('semester') or payload.get('Semester')
    section_raw = payload.get('section') or payload.get('Section')
    token_provided = payload.get('token')
    fingerprint = payload.get('fingerprint')

    # Security Check: Verify Access Token
    if token_provided != CURRENT_ACCESS_TOKEN:
        return JsonResponse({'status': 'error', 'error': 'Invalid access token'}, status=403)

    # Advanced Link Security: Verify Signature if advanced params are present
    # If any class parameter is provided, we REQUIRE a valid signature to prevent manipulation
    has_advanced_params = any([branch_raw, year_raw, semester_raw, section_raw])
    if has_advanced_params:
        sig = payload.get('sig')
        if not sig:
            return JsonResponse({'status': 'error', 'error': 'Security signature missing for advanced link'}, status=403)
        
        signer = Signer(sep=':')
        try:
            # Reconstruct the string that was signed: "branch|year|semester|section"
            # Note: order and format must match the generator
            expected_data = f"{branch_raw}|{year_raw}|{semester_raw}|{section_raw}"
            signer.unsign(f"{expected_data}:{sig}")
        except BadSignature:
            return JsonResponse({'status': 'error', 'error': 'Invalid security signature. URL may have been tampered with.'}, status=403)

    # validate inputs via serializer (Django Form)
    serializer = LoginSerializer(data={
        'branch': branch_raw,
        'year': year_raw,
        'semester': semester_raw,
        'section': section_raw
    })
    
    if not serializer.is_valid():
        return JsonResponse({'status': 'error', 'errors': serializer.errors}, status=400)

    branch = serializer.cleaned_data.get('branch')
    year = serializer.cleaned_data.get('year')
    semester = serializer.cleaned_data.get('semester')
    section = serializer.cleaned_data.get('section')

    # Use fingerprint as ID if provided, otherwise fallback to random (random is less secure for session persistence)
    student_id = fingerprint if fingerprint else 'STU-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

    # Generate JWT with class info
    token = generate_jwt({
        'enrollment': student_id,
        'branch': branch,
        'year': year,
        'semester': semester,
        'section': section,
        'name': f"Guest Student ({student_id[:8]})"
    }, user_type='student')

    return JsonResponse({
        'status': 'ok',
        'message': 'login successful',
        'EnrollmentNo': student_id,
        'FullName': f"Guest Student ({student_id[:8]})",
        'branch': branch,
        'year': year,
        'semester': semester,
        'section': section,
        'access': token,
    })

# logout api

@csrf_exempt
@require_POST
def logout(request):
    # Clear session data
    request.session.flush()

    # Remove cookie from client
    response = JsonResponse({"status": "ok", "message": "logged out successfully"})
    response.delete_cookie('sessionid')

    return response



@require_GET
@jwt_required
def my_teachers(request):
    """
    Return subjects and their assigned teachers for the logged-in student.
    Matches student Branch, Year, Section, and Semester with Academic_Allocation.
    """

    enrollment = request.jwt_payload.get("enrollment")
    branch = request.jwt_payload.get("branch")
    year = request.jwt_payload.get("year")
    semester = request.jwt_payload.get("semester")
    section = request.jwt_payload.get("section")

    if not enrollment or not branch or not year or not semester or not section:
        return JsonResponse({"status": "error", "error": "invalid token payload"}, status=401)

    qs = Academic_Allocation.objects.select_related("TeacherID", "SubjectCode") \
        .filter(
            TargetBranch__iexact=branch,
            Target_Year=year,
            Target_Section=section,
            Target_Semester=semester,
            SubjectCode__Semester=semester,          # subject's Semester matches student
            SubjectCode__Branch__iexact=branch       # subject's Branch matches student
        ) \
    .order_by("SubjectCode__SubjectCode")

    # Get all submitted allocations for this student to show status
    submitted_allocations = set(
        Feedback_SubmissionLog.objects.filter(EnrollmentNo=enrollment)
        .values_list("AllocationID", flat=True)
    )

    subjects_map = {}

    for alloc in qs:
        subj = alloc.SubjectCode
        teacher = alloc.TeacherID

        if not subj or not teacher:
            continue

        key = subj.SubjectCode

        if key not in subjects_map:
            subjects_map[key] = {
                "subject_code": subj.SubjectCode,
                "subject_name": subj.SubjectName,
                "semester": subj.Semester,
                "branch": subj.Branch,
                "teachers": []
            }

        subjects_map[key]["teachers"].append({
            "allocation_id": alloc.AllocationID,
            "teacher_id": teacher.TeacherID,
            "teacher_name": teacher.FullName,
            "designation": teacher.Designation,
            "is_submitted": alloc.AllocationID in submitted_allocations
        })

    return JsonResponse({
        "status": "ok",
        "enrollment": enrollment,
        "branch": branch,
        "year": year,
        "semester": semester,
        "section": section,
        "subjects": list(subjects_map.values())
    })



@csrf_exempt
@require_POST
@jwt_required
def submit_feedback(request):
    """
    Student submits feedback using allocation_id + subject_code.
    Backend verifies allocation matches student class + subject.
    Supports JSON, form-data, form-urlencoded.
    """

    # -------------------------------------
    # 1. Parse Input (JSON OR FORM)
    # -------------------------------------
    raw_body = request.body or b""
    payload = {}

    content_type = request.META.get("CONTENT_TYPE", "")
    is_json = "application/json" in content_type

    if raw_body:
        text = raw_body.decode("utf-8").strip()

        if is_json or text.startswith("{"):  # JSON input
            try:
                payload = json.loads(text)
            except Exception:
                return JsonResponse({"status": "error", "error": "invalid JSON"}, status=400)
        else:
            payload = request.POST.dict()
    else:
        payload = request.POST.dict() or request.GET.dict()

    # -------------------------------------
    # 2. Validate With Serializer
    # -------------------------------------
    form = FeedbackSerializer(data=payload)
    if not form.is_valid():
        return JsonResponse({"status": "error", "errors": form.errors}, status=400)

    allocation_id = form.cleaned_data.get("allocation_id")
    subject_code = form.cleaned_data.get("subject_code")
    comments = form.cleaned_data.get("comments")

    ratings = {f"q{i}": form.cleaned_data.get(f"q{i}") for i in range(1, 11)}

    # -------------------------------------
    # 3. Get Student Info from JWT
    # -------------------------------------
    enrollment_no = request.jwt_payload.get("enrollment")
    student_branch = request.jwt_payload.get("branch")
    student_year = request.jwt_payload.get("year")
    student_semester = request.jwt_payload.get("semester")
    student_section = request.jwt_payload.get("section")

    if not enrollment_no or not student_branch:
        return JsonResponse({"status": "error", "error": "invalid token payload"}, status=401)

    # -------------------------------------
    # 4. Lookup Allocation
    # -------------------------------------
    try:
        alloc = Academic_Allocation.objects.select_related("TeacherID", "SubjectCode").get(
            AllocationID=allocation_id
        )
    except Academic_Allocation.DoesNotExist:
        return JsonResponse({
            "status": "error",
            "error": "Invalid allocation_id"
        }, status=404)

    # -------------------------------------
    # 5. Subject must match allocation
    # -------------------------------------
    if alloc.SubjectCode.SubjectCode != subject_code:
        return JsonResponse({
            "status": "error",
            "error": "subject mismatch for allocation_id"
        }, status=403)

    # -------------------------------------
    # 6. Allocation must belong to student's class
    # -------------------------------------
    if (
        alloc.TargetBranch.lower() != student_branch.lower()
        or alloc.Target_Year != student_year
        or alloc.Target_Section != student_section
        or alloc.Target_Semester != student_semester
    ):
        return JsonResponse({
            "status": "error",
            "error": "allocation_id does not belong to logged-in student"
        }, status=403)

    # -------------------------------------
    # 7. Check duplicate feedback for this session ID
    # -------------------------------------
    if Feedback_SubmissionLog.objects.filter(
        EnrollmentNo=enrollment_no, AllocationID=alloc
    ).exists():
        return JsonResponse({
            "status": "error",
            "error": "feedback already submitted"
        }, status=409)

    # -------------------------------------
    # 8. Save feedback atomically
    # -------------------------------------
    try:
        with transaction.atomic():

            feedback = Feedback_Response(
                AllocationID=alloc,
                Q1_Rating=ratings["q1"],
                Q2_Rating=ratings["q2"],
                Q3_Rating=ratings["q3"],
                Q4_Rating=ratings["q4"],
                Q5_Rating=ratings["q5"],
                Q6_Rating=ratings["q6"],
                Q7_Rating=ratings["q7"],
                Q8_Rating=ratings["q8"],
                Q9_Rating=ratings["q9"],
                Q10_Rating=ratings["q10"],
                Comments=comments or None
            )
            feedback.full_clean()
            feedback.save()

            Feedback_SubmissionLog.objects.create(
                ResponseID=feedback,
                EnrollmentNo=enrollment_no,
                AllocationID=alloc
            )

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": "failed to save feedback",
            "details": str(e)
        }, status=500)

    return JsonResponse({
        "status": "ok",
        "message": "feedback submitted",
        "allocation_id": alloc.AllocationID
    })


@require_GET
@jwt_required
def my_feedbacks(request):
    """
    Return a list of feedbacks submitted by the logged-in student.
    Includes teacher and subject details along with ratings.
    """
    enrollment = request.jwt_payload.get("enrollment")
    
    # Filter logs for this student
    logs = Feedback_SubmissionLog.objects.filter(EnrollmentNo=enrollment).select_related(
        "ResponseID", 
        "AllocationID__TeacherID", 
        "AllocationID__SubjectCode"
    ).order_by("-Timestamp")

    results = []
    for log in logs:
        resp = log.ResponseID
        alloc = log.AllocationID
        teacher = alloc.TeacherID
        subject = alloc.SubjectCode

        results.append({
            "log_id": log.LogID,
            "timestamp": log.Timestamp,
            "teacher_name": teacher.FullName,
            "subject_name": subject.SubjectName,
            "subject_code": subject.SubjectCode,
            "ratings": {
                "q1": resp.Q1_Rating,
                "q2": resp.Q2_Rating,
                "q3": resp.Q3_Rating,
                "q4": resp.Q4_Rating,
                "q5": resp.Q5_Rating,
                "q6": resp.Q6_Rating,
                "q7": resp.Q7_Rating,
                "q8": resp.Q8_Rating,
                "q9": resp.Q9_Rating,
                "q10": resp.Q10_Rating,
            },
            "comments": resp.Comments
        })

    return JsonResponse({
        "status": "ok",
        "feedbacks": results
    })


def check_db_connection_and_list_tables():
    try:
        with connections['default'].cursor() as cur:
            # lightweight check
            cur.execute("SELECT 1")
        print("database connection successful")
    except DatabaseError:
        print("connection failed")

check_db_connection_and_list_tables()


# ============================================
# ADMIN ENDPOINTS
# ============================================

import os
from django.apps import apps

# LEGACY ADMIN DECORATOR REMOVED


@csrf_exempt
def admin_login(request):
    """Admin login using credentials from .env file"""
    # Manual POST check
    if request.method != 'POST':
        return JsonResponse({"status": "error", "error": "method not allowed"}, status=405)
    
    try:
        payload = json.loads(request.body)
    except:
        return JsonResponse({"status": "error", "error": "invalid JSON"}, status=400)
    
    username = payload.get("username")
    password = payload.get("password")
    
    # Get admin credentials from environment
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin@123")
    
    if username == admin_username and password == admin_password:
        # Generate JWT
        token = generate_jwt({
            'username': username
        }, user_type='admin')

        return JsonResponse({
            'status': 'ok',
            'message': 'admin login successful',
            'username': username,
            'access': token
        })
    
    return JsonResponse({"status": "error", "error": "invalid credentials"}, status=401)


@require_GET
@jwt_admin_required
def admin_list_tables(request):
    """List all database tables"""
    try:
        # Get all models from the app
        models = apps.get_app_config('feedback_app').get_models()
        
        tables = []
        for model in models:
            table_name = model._meta.db_table
            model_name = model.__name__
            
            # Get row count
            try:
                count = model.objects.count()
            except:
                count = 0
            
            tables.append({
                "table_name": table_name,
                "model_name": model_name,
                "row_count": count
            })
        
        return JsonResponse({
            "status": "ok",
            "tables": sorted(tables, key=lambda x: x['model_name'])
        })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": str(e)
        }, status=500)


@require_GET
@jwt_admin_required
def admin_get_table_data(request, table_name):
    """Get data from a specific table with optional pagination"""
    try:
        # Find the model by table name
        model = None
        for m in apps.get_app_config('feedback_app').get_models():
            if m._meta.db_table == table_name or m.__name__ == table_name:
                model = m
                break
        
        if not model:
            return JsonResponse({
                "status": "error",
                "error": f"table '{table_name}' not found"
            }, status=404)
        
        # Check for no-pagination flag
        nopaginate = request.GET.get('nopaginate', 'false').lower() == 'true'
        
        # Get query parameters for sorting and searching
        sort_by = request.GET.get('sort_by')
        order = request.GET.get('order', 'asc')
        search_term = request.GET.get('search', '')
        
        # Initial queryset
        queryset = model.objects.all()
        
        # Apply Search
        if search_term:
            from django.db.models import Q
            search_query = Q()
            # Search across all text-based fields
            for field in model._meta.get_fields():
                if field.is_relation:
                     continue
                # Simple check for text fields (adjust based on needs)
                internal_type = field.get_internal_type()
                if internal_type in ['CharField', 'TextField', 'IntegerField', 'EmailField', 'FloatField', 'DecimalField']:
                     search_query |= Q(**{f"{field.name}__icontains": search_term})
            
            queryset = queryset.filter(search_query)

        # Apply Sorting
        if sort_by:
            # Validate field exists
            field_names = [f.name for f in model._meta.get_fields()]
            if sort_by in field_names:
                if order == 'desc':
                    queryset = queryset.order_by(f'-{sort_by}')
                else:
                    queryset = queryset.order_by(sort_by)

        # Get total count after filtering
        total = queryset.count()
        
        if nopaginate:
            # Get all data
            page = 1
            page_size = total if total > 0 else 1
            total_pages = 1
        else:
            # Standard Pagination
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 50))
            if page_size < 1: page_size = 10 
            
            start = (page - 1) * page_size
            end = start + page_size
            queryset = queryset[start:end]
            total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
            
        # Get field names and metadata
        fields = []
        field_meta = {}
        
        for f in model._meta.get_fields():
            if f.many_to_many or f.one_to_many:
                continue
            
            fields.append(f.name)
            
            # Determine type
            internal_type = f.get_internal_type()
            
            # Extract metadata
            meta = {
                'type': 'text',
                'required': not f.blank and not f.null,
                'choices': [],
                'is_auto': False
            }
            
            if internal_type == 'BooleanField':
                meta['type'] = 'boolean'
            elif internal_type in ['DateField', 'DateTimeField']:
                meta['type'] = 'date'
            elif internal_type in ['IntegerField', 'BigIntegerField', 'PositiveSmallIntegerField', 'AutoField', 'BigAutoField', 'SmallAutoField']:
                meta['type'] = 'number'
                # Check for AutoField or similar auto-incrementing fields
                from django.db import models
                if isinstance(f, (models.AutoField, models.BigAutoField, models.SmallAutoField)) or getattr(f, 'auto_created', False):
                    meta['is_auto'] = True
            elif internal_type in ['FloatField', 'DecimalField']:
                meta['type'] = 'float'
                
            # Extract choices if available
            if f.choices:
                meta['type'] = 'select' 
                meta['choices'] = [{'value': c[0], 'label': str(c[1])} for c in f.choices]
            
            # --- Inject System Selectors for Common Fields ---
            field_name_lower = f.name.lower()
            
            # Branch Choices
            if 'branch' in field_name_lower:
                meta['type'] = 'select'
                meta['choices'] = [{'value': b, 'label': b} for b in ['CS', 'IT', 'DS', 'AIML', 'CY', 'CSIT', 'EC', 'CIVIL', 'MECHANICAL']]
                
            # Semester Choices
            elif 'semester' in field_name_lower:
                meta['type'] = 'select'
                meta['choices'] = [{'value': i, 'label': f"Semester {i}"} for i in range(1, 9)]
                
            # Year Choices
            elif 'year' in field_name_lower:
                meta['type'] = 'select'
                meta['choices'] = [{'value': i, 'label': f"Year {i}"} for i in range(1, 5)]
                
            # Section Choices
            elif 'section' in field_name_lower:
                meta['type'] = 'select'
                meta['choices'] = [{'value': i, 'label': f"Section {i}"} for i in range(1, 6)]
            
            field_meta[f.name] = meta
        
        # Convert to list of dicts
        
        # Convert to list of dicts
        data = []
        for obj in queryset:
            row = {}
            for field in fields:
                try:
                    value = getattr(obj, field)
                    # Convert to JSON-serializable format
                    if hasattr(value, 'isoformat'):  # datetime/date
                        value = value.isoformat()
                    elif hasattr(value, 'pk'):  # Foreign key
                        # USER REQUEST: Show raw ID instead of str(obj)
                        value = value.pk
                    row[field] = value
                except:
                    row[field] = None
            data.append(row)
        
        # Get primary key field
        pk_field = model._meta.pk.name
        
        return JsonResponse({
            "status": "ok",
            "model_name": model.__name__,
            "table_name": model._meta.db_table,
            "pk_field": pk_field,
            "fields": fields,
            "field_meta": field_meta,
            "data": data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_POST
@jwt_admin_required
def admin_add_row(request, table_name):
    """Add a new row to a table"""
    # Restricted Tables
    if table_name.lower() in ['feedback_response', 'feedback_submissionlog']:
        return JsonResponse({"status": "error", "error": "This table is read-only"}, status=403)
        
    try:
        # Find the model
        model = None
        for m in apps.get_app_config('feedback_app').get_models():
            if m._meta.db_table == table_name or m.__name__ == table_name:
                model = m
                break
        
        if not model:
            return JsonResponse({
                "status": "error",
                "error": f"table '{table_name}' not found"
            }, status=404)
        
        # Parse request body
        try:
            payload = json.loads(request.body)
        except:
            return JsonResponse({"status": "error", "error": "invalid JSON"}, status=400)
            
        # Map models to serializers for better validation
        serializer_map = {
            'Academic_Subject': AcademicSubjectSerializer,
            'Faculty_Teacher': FacultyTeacherSerializer,
            'Academic_Allocation': AcademicAllocationSerializer
        }
        
        serializer_class = serializer_map.get(model.__name__)
        
        if serializer_class:
            serializer = serializer_class(data=payload)
            if not serializer.is_valid():
                # Extract and format errors
                error_msgs = []
                for field, errors in serializer.errors.items():
                    error_msgs.append(f"{field}: {', '.join(errors)}")
                return JsonResponse({"status": "error", "error": "; ".join(error_msgs)}, status=400)
            
            # Use serializer data to create obj
            obj = serializer.save()
            return JsonResponse({
                "status": "ok",
                "message": "row added successfully",
                "pk": obj.pk
            })
            
        # Fallback for models without dedicated serializers
        # Create new object instance
        obj = model()
        
        # Set fields
        for field_name, value in payload.items():
            if not value:
                continue

            try:
                field = model._meta.get_field(field_name)
                
                # Handle foreign keys
                if field.is_relation and field.many_to_one:
                    related_model = field.related_model
                    try:
                        related_obj = related_model.objects.get(pk=value)
                        setattr(obj, field_name, related_obj)
                    except related_model.DoesNotExist:
                         return JsonResponse({"status": "error", "error": f"Invalid ID {value} for field {field_name}"}, status=400)
                else:
                    setattr(obj, field_name, value)
            except Exception as e:
                # Field might not exist or other error, log/ignore
                pass
        
        try:
            obj.full_clean()
            obj.save()
            return JsonResponse({
                "status": "ok",
                "message": "row added successfully",
                "pk": obj.pk
            })
        except ValidationError as e:
             return JsonResponse({"status": "error", "error": str(e.message_dict)}, status=400)
             
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_POST
@jwt_admin_required
def admin_update_row(request, table_name, row_id):
    """Update a row in a table"""
    # Restricted Tables
    if table_name.lower() in ['feedback_response', 'feedback_submissionlog']:
        return JsonResponse({"status": "error", "error": "This table is read-only"}, status=403)
        
    try:
        # Find the model
        model = None
        for m in apps.get_app_config('feedback_app').get_models():
            if m._meta.db_table == table_name or m.__name__ == table_name:
                model = m
                break
        
        if not model:
            return JsonResponse({
                "status": "error",
                "error": f"table '{table_name}' not found"
            }, status=404)
        
        # Parse request body
        try:
            payload = json.loads(request.body)
        except:
            return JsonResponse({"status": "error", "error": "invalid JSON"}, status=400)
        
        # Get the object
        try:
            obj = model.objects.get(pk=row_id)
        except model.DoesNotExist:
            return JsonResponse({
                "status": "error",
                "error": f"row with id {row_id} not found"
            }, status=404)
        
        # Map models to serializers for better validation
        serializer_map = {
            'Academic_Subject': AcademicSubjectSerializer,
            'Faculty_Teacher': FacultyTeacherSerializer,
            'Academic_Allocation': AcademicAllocationSerializer
        }
        
        serializer_class = serializer_map.get(model.__name__)
        
        if serializer_class:
            serializer = serializer_class(obj, data=payload, partial=True)
            if not serializer.is_valid():
                error_msgs = []
                for field, errors in serializer.errors.items():
                    error_msgs.append(f"{field}: {', '.join(errors)}")
                return JsonResponse({"status": "error", "error": "; ".join(error_msgs)}, status=400)
            
            serializer.save()
            return JsonResponse({
                "status": "ok",
                "message": "row updated successfully"
            })

        # Fallback for models without dedicated serializers
        # Update fields
        for field, value in payload.items():
            if hasattr(obj, field):
                # Handle foreign keys
                field_obj = model._meta.get_field(field)
                if field_obj.is_relation:
                    # Get related model
                    related_model = field_obj.related_model
                    if value:
                        try:
                            related_obj = related_model.objects.get(pk=value)
                            setattr(obj, field, related_obj)
                        except:
                            pass
                else:
                    setattr(obj, field, value)
        
        obj.save()
        
        return JsonResponse({
            "status": "ok",
            "message": "row updated successfully"
        })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": str(e)
        }, status=500)


@csrf_exempt
@require_POST
@jwt_admin_required
def admin_delete_row(request, table_name, row_id):
    """Delete a row from a table"""
    # Restricted Tables
    if table_name.lower() in ['feedback_response', 'feedback_submissionlog']:
        return JsonResponse({"status": "error", "error": "This table is read-only"}, status=403)

    try:
        # Find the model
        model = None
        for m in apps.get_app_config('feedback_app').get_models():
            if m._meta.db_table == table_name or m.__name__ == table_name:
                model = m
                break
        
        if not model:
            return JsonResponse({
                "status": "error",
                "error": f"table '{table_name}' not found"
            }, status=404)
        
        # Get and delete the object
        try:
            obj = model.objects.get(pk=row_id)
            obj.delete()
            
            return JsonResponse({
                "status": "ok",
                "message": "row deleted successfully"
            })
        except model.DoesNotExist:
            return JsonResponse({
                "status": "error",
                "error": f"row with id {row_id} not found"
            }, status=404)
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": str(e)
        }, status=500)
@csrf_exempt
@jwt_admin_required
def admin_get_token(request):
    """Fetch the current global student access token"""
    return JsonResponse({
        'status': 'ok',
        'token': CURRENT_ACCESS_TOKEN
    })

@csrf_exempt
@require_POST
@jwt_admin_required
def admin_update_token(request):
    """Update the global student access token"""
    global CURRENT_ACCESS_TOKEN
    try:
        payload = json.loads(request.body)
        new_token = payload.get('token')
        if not new_token:
            return JsonResponse({'status': 'error', 'error': 'token is required'}, status=400)
        
        CURRENT_ACCESS_TOKEN = new_token
        return JsonResponse({
            'status': 'ok',
            'message': 'access token updated successfully',
            'token': CURRENT_ACCESS_TOKEN
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)

@csrf_exempt
@require_GET
@jwt_admin_required
def admin_teacher_report(request):
    """
    Categorizes teachers into 3 parts based on average rating:
    - Excellent: 4-5
    - Good: 2-4
    - Need Improvement: < 2
    """
    try:
        results = Feedback_Response.objects.values(
            teacher_id=F('AllocationID__TeacherID__TeacherID'),
            full_name=F('AllocationID__TeacherID__FullName')
        ).annotate(
            avg_rating=Avg(
                (F('Q1_Rating') + F('Q2_Rating') + F('Q3_Rating') + F('Q4_Rating') + F('Q5_Rating') +
                 F('Q6_Rating') + F('Q7_Rating') + F('Q8_Rating') + F('Q9_Rating') + F('Q10_Rating')) / 10.0
            ),
            q1=Avg('Q1_Rating'),
            q2=Avg('Q2_Rating'),
            q3=Avg('Q3_Rating'),
            q4=Avg('Q4_Rating'),
            q5=Avg('Q5_Rating'),
            q6=Avg('Q6_Rating'),
            q7=Avg('Q7_Rating'),
            q8=Avg('Q8_Rating'),
            q9=Avg('Q9_Rating'),
            q10=Avg('Q10_Rating'),
            response_count=Count('ResponseID')
        ).order_by('-avg_rating')

        report_data = []
        summary = {
            'excellent': 0,
            'good': 0,
            'needs_improvement': 0,
            'total_teachers': 0
        }

        for res in results:
            avg = float(res['avg_rating'] or 0)
            category = ""
            if avg >= 4.0:
                category = "Excellent"
                summary['excellent'] += 1
            elif avg >= 2.0:
                category = "Good"
                summary['good'] += 1
            else:
                category = "Need Improvement"
                summary['needs_improvement'] += 1
            
            summary['total_teachers'] += 1
            
            report_data.append({
                'teacher_id': res['teacher_id'],
                'full_name': res['full_name'],
                'average_rating': round(avg, 2),
                'response_count': res['response_count'],
                'category': category,
                'question_stats': {
                    'q1': round(float(res['q1'] or 0), 2),
                    'q2': round(float(res['q2'] or 0), 2),
                    'q3': round(float(res['q3'] or 0), 2),
                    'q4': round(float(res['q4'] or 0), 2),
                    'q5': round(float(res['q5'] or 0), 2),
                    'q6': round(float(res['q6'] or 0), 2),
                    'q7': round(float(res['q7'] or 0), 2),
                    'q8': round(float(res['q8'] or 0), 2),
                    'q9': round(float(res['q9'] or 0), 2),
                    'q10': round(float(res['q10'] or 0), 2),
                }
            })

        return JsonResponse({
            'status': 'ok',
            'summary': summary,
            'data': report_data
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)
@csrf_exempt
@require_POST
@jwt_admin_required
def admin_generate_signature(request):
    """Generate a cryptographic signature for a class link to prevent tampering"""
    try:
        payload = json.loads(request.body)
        branch = payload.get('branch', '')
        year = str(payload.get('year', ''))
        semester = str(payload.get('semester', ''))
        section = str(payload.get('section', ''))

        if not all([branch, year, semester, section]):
            return JsonResponse({"status": "error", "error": "Missing class parameters"}, status=400)

        # Create a stable string to sign
        data_to_sign = f"{branch}|{year}|{semester}|{section}"
        
        signer = Signer(sep=':')
        signed_value = signer.sign(data_to_sign)
        
        # Extract the signature part (the part after the separator)
        signature = signed_value.split(':')[-1]

        return JsonResponse({
            "status": "ok",
            "signature": signature
        })
    except Exception as e:
        return JsonResponse({"status": "error", "error": str(e)}, status=500)
