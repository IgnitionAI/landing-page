# Environment Variables Setup

## Azure Table Storage Configuration

To enable vector data loading from Azure Table Storage, add the following variables to your `.env.local` file:

```bash
# Azure Table Storage
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net"
AZURE_STORAGE_TABLE_NAME="your-table-name"
```

## How to get these values

1. **AZURE_STORAGE_CONNECTION_STRING**: 
   - Go to Azure Portal → Your Storage Account → Access Keys
   - Copy the "Connection string" value

2. **AZURE_STORAGE_TABLE_NAME**: 
   - The name of your Azure Table that contains the vector data
   - Table should have the following structure:
     - `partitionKey`: Category/group of the vector
     - `rowKey`: Unique ID
     - `timestamp`: ISO timestamp
     - `vector`: Comma-separated numbers (e.g., "0.1,0.2,0.3,...")
     - `text`: The text content associated with the vector

## Usage

Once configured, the vector store will automatically load vectors from Azure Table Storage when you call:

```typescript
import { useVectorStore } from '@/lib/store/vector-store';

const { loadVectorsFromAzure, isLoadingVectors } = useVectorStore();

// Load vectors
await loadVectorsFromAzure();
```
