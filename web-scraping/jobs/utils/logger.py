# Standard Library Imports
import json
import os
from datetime import datetime

# Third-Party Imports
import boto3

# S3 Configuration (must be set via environment variables)
<<<<<<< Updated upstream
MINIO_ENDPOINT = 'minio.argo.svc.cluster.local:9000'  # MinIO endpoint
=======
# MINIO_ENDPOINT can be overridden via env var, defaults to Kubernetes service DNS
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT')
>>>>>>> Stashed changes
ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY')
SECRET_KEY = os.getenv('MINIO_SECRET_KEY')
BUCKET_NAME = 'argo-logs'

class Logger:
    def __init__(self, job_name):
        """
        Initializes the Logger object.

        Args:
            log_path (str): The S3 path (key) where the logs will be stored.
        """
        self.job_name = job_name
        self.log_path = self.generate_log_path()

        self.log_content = []  # Collect log entries in memory
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f'http://{MINIO_ENDPOINT}',
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY,
            config=boto3.session.Config(signature_version='s3v4')
        )

    def generate_log_path(self):
        """Generate the log path based on the job name and timestamp."""
        current_time = datetime.now()
        date_str = current_time.strftime("%m-%d-%Y")
        time_str = current_time.strftime("%H-%M")
        log_path = f"{self.job_name}/{date_str}/{time_str}.log"
        return log_path

    def log_json(self, level, message, context=None):
        """Log the message as a JSON object with timestamp, level, message, and context (if present)."""
        log_entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "level": level,
            "message": message
        }
        
        if context:
            log_entry["context"] = context
        
        self.log_content.append(json.dumps(log_entry))

    def upload_logs(self):
        """Uploads accumulated logs to S3 when context is exited."""
        log_data = "\n".join(self.log_content)
        try:
            self.s3_client.put_object(Body=log_data, Bucket=BUCKET_NAME, Key=self.log_path)
            print(f"Logs successfully uploaded to {self.log_path}")
        except Exception as e:
            print(f"Failed to upload logs to S3: {e}")
            raise

    def __enter__(self):
        """Enter the context and initialize the logging."""
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        """Exit the context and write the logs to S3."""
        self.upload_logs()
