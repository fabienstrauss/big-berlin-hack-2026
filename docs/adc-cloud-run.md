# ADC-First Setup (with API-Key Fallback)

This project is implemented to use Vertex AI through Application Default Credentials (ADC) and Cloud Run service account IAM.

If you already have a Google GenAI/Vertex API key, local development can use:

```bash
export GOOGLE_API_KEY=<YOUR_KEY>
export GOOGLE_GENAI_API_VERSION=v1beta
```

The provider automatically prefers ADC (project+location) when configured, and falls back to `GOOGLE_API_KEY` otherwise.

## 1) Local development

```bash
gcloud init
gcloud auth login
gcloud auth application-default login
gcloud config set project <PROJECT_ID>
```

Set runtime env:

```bash
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT=<PROJECT_ID>
export GOOGLE_CLOUD_LOCATION=europe-west4
```

## 2) APIs to enable

```bash
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

## 3) Secret Manager (partner keys)

```bash
printf '%s' '<TAVILY_API_KEY>'  | gcloud secrets create TAVILY_API_KEY  --data-file=-
printf '%s' '<GRADIUM_API_KEY>' | gcloud secrets create GRADIUM_API_KEY --data-file=-
printf '%s' '<HERA_API_KEY>'    | gcloud secrets create HERA_API_KEY    --data-file=-
printf '%s' '<SUPABASE_SERVICE_ROLE_KEY>' | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
```

If a secret exists, add a new version instead:

```bash
printf '%s' '<NEW_VALUE>' | gcloud secrets versions add TAVILY_API_KEY --data-file=-
```

## 4) Runtime service account

```bash
gcloud iam service-accounts create video-pipeline-sa \
  --display-name="Video Pipeline SA"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:video-pipeline-sa@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:video-pipeline-sa@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:video-pipeline-sa@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

Create a bucket for generated video artifacts:

```bash
gcloud storage buckets create gs://<GCS_VIDEO_BUCKET> \
  --location=europe-west4 \
  --uniform-bucket-level-access
```

## 5) Cloud Run deploy

```bash
gcloud run deploy video-pipeline \
  --source . \
  --region europe-west4 \
  --service-account video-pipeline-sa@<PROJECT_ID>.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=<PROJECT_ID>,GOOGLE_CLOUD_LOCATION=europe-west4,GCS_VIDEO_BUCKET=<GCS_VIDEO_BUCKET>,GCS_SIGNED_URL_TTL_SECONDS=86400,NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>,NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY> \
  --set-secrets TAVILY_API_KEY=TAVILY_API_KEY:latest,GRADIUM_API_KEY=GRADIUM_API_KEY:latest,HERA_API_KEY=HERA_API_KEY:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest
```

## 6) Org policy checks (admin track)

If your org blocks API key creation, this implementation still works because it does not require Google API keys.

Admins can still inspect these policies for visibility:

- `constraints/iam.managed.disableServiceAccountApiKeyCreation`
- Custom constraints over `apikeys.googleapis.com/Key` CREATE/UPDATE
