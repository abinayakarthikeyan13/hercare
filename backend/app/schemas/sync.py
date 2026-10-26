from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class CloudSyncToggleRequest(BaseModel):
    enabled: bool

class CloudSyncStatusResponse(BaseModel):
    cloud_sync_enabled: bool
    preferences_synced: bool
    cycles_count: int
    chat_messages_count: int
    encryption: str = "AES-256-GCM"
    integrity: str = "SHA-256"
    key_storage: str = "Environment Variable (AES_MASTER_KEY)"

class ExportDataResponse(BaseModel):
    exported_at: datetime
    user_id: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    cloud_sync_enabled: bool
    preferences: Optional[Dict[str, Any]] = None
    cycles: List[Dict[str, Any]] = []
    chat_history: List[Dict[str, Any]] = []
    security_audit: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)
