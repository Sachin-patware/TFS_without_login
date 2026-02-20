from django.contrib import admin
from django.urls import path
from feedback_app import views as feedback_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', feedback_views.login, name='login'),
    path('logout/', feedback_views.logout, name='logout'),
    path("my-teachers/", feedback_views.my_teachers),
    path("submit-feedback/", feedback_views.submit_feedback),
    path("my-feedbacks/", feedback_views.my_feedbacks),
    
    # Admin endpoints
    path("dashboard-admin/login/", feedback_views.admin_login, name='admin_login'),
    path("dashboard-admin/tables/", feedback_views.admin_list_tables, name='admin_list_tables'),
    path("dashboard-admin/table/<str:table_name>/", feedback_views.admin_get_table_data, name='admin_get_table_data'),
    path("dashboard-admin/table/<str:table_name>/add/", feedback_views.admin_add_row, name='admin_add_row'),
    path("dashboard-admin/table/<str:table_name>/<str:row_id>/update/", feedback_views.admin_update_row, name='admin_update_row'),
    path("dashboard-admin/table/<str:table_name>/<str:row_id>/delete/", feedback_views.admin_delete_row, name='admin_delete_row'),
]
