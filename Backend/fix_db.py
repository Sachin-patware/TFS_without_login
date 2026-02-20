import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'feedbacksystem.settings')
django.setup()

def drop_constraint():
    with connection.cursor() as cursor:
        try:
            print("Attempting to drop constraint FK_Log_Student...")
            cursor.execute("ALTER TABLE feedback_submissionlog DROP CONSTRAINT FK_Log_Student")
            print("Successfully dropped FK_Log_Student.")
        except Exception as e:
            print(f"Error dropping constraint: {e}")
            
        try:
            print("Attempting to drop table users_student...")
            cursor.execute("DROP TABLE users_student")
            print("Successfully dropped users_student.")
        except Exception as e:
            print(f"Error dropping table: {e}")

if __name__ == "__main__":
    drop_constraint()
