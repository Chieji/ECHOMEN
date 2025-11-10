# ECHOMEN Tool Integration Implementation Guide

This guide provides step-by-step instructions for integrating the new **Memory Tools** and **Data Analysis Tools** into the ECHOMEN agent orchestrator and backend execution engine.

## Overview

The new tools have been added to `services/tools.ts` with the following structure:

- **Memory Tools (Supabase Integration):** `memory_save`, `memory_retrieve`, `memory_delete`
- **Data Analysis Tools (Python Integration):** `data_analyze`, `data_visualize`

These tools are now declared in the `toolDeclarations` array and registered in the `availableTools` object, making them available to the agent orchestrator.

## Phase 1: Backend Integration

### Step 1.1: Update the Execution Engine (`orchestrator.py` or equivalent backend)

The backend execution engine must handle the new tool calls. Add handlers for:

1. **Memory Tools:**
   - `memory_save`: Connect to Supabase and insert/update a record in a `memories` table
   - `memory_retrieve`: Query the Supabase `memories` table by `key` or `tags`
   - `memory_delete`: Delete a record from the Supabase `memories` table

2. **Data Analysis Tools:**
   - `data_analyze`: Execute the provided Python script and capture the output
   - `data_visualize`: Execute the provided Python script and verify the image was created

### Step 1.2: Supabase Setup

Create a new table in your Supabase database:

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memories_key ON memories(key);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
```

### Step 1.3: Backend Tool Handlers (Python Example)

Add the following handlers to your backend execution engine:

```python
from supabase import create_client
import json

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

def memory_save(key: str, value: str, tags: list) -> dict:
    """Save a memory item to Supabase."""
    try:
        response = supabase.table("memories").upsert(
            {"key": key, "value": value, "tags": tags}
        ).execute()
        return {"success": True, "message": f"Memory item '{key}' saved successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def memory_retrieve(key: str = None, tags: list = None) -> dict:
    """Retrieve memory items from Supabase."""
    try:
        if key:
            response = supabase.table("memories").select("*").eq("key", key).execute()
        elif tags:
            response = supabase.table("memories").select("*").contains("tags", tags).execute()
        else:
            return {"success": False, "error": "Must provide either key or tags."}
        
        return {"success": True, "data": response.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def memory_delete(key: str) -> dict:
    """Delete a memory item from Supabase."""
    try:
        response = supabase.table("memories").delete().eq("key", key).execute()
        return {"success": True, "message": f"Memory item '{key}' deleted successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### Step 1.4: Data Analysis Tool Handlers

The data analysis tools are already implemented in the frontend (`services/tools.ts`) to use `executeShellCommand`. The backend simply needs to ensure Python and required libraries (Pandas, Matplotlib) are available in the sandbox environment.

## Phase 2: Frontend Integration

### Step 2.1: Update the Agent Executor

The agent executor (likely in `services/agentExecutor.ts`) should already recognize the new tools from the `toolDeclarations`. Ensure that:

1. The orchestrator passes the new tools to the LLM when generating responses
2. The executor handles tool calls for the new tools appropriately

### Step 2.2: Update the UI Components

Consider adding UI components to visualize:

1. **Memory Usage:** Display saved memory items in a panel or sidebar
2. **Data Analysis Results:** Show analysis results and visualizations in the artifacts panel

Example UI enhancement for memory visualization:

```typescript
// In a new component, e.g., MemoryPanel.tsx
import React, { useState, useEffect } from 'react';

export const MemoryPanel: React.FC = () => {
    const [memories, setMemories] = useState<any[]>([]);

    useEffect(() => {
        // Fetch and display saved memories
        // This would integrate with the backend memory retrieval
    }, []);

    return (
        <div className="memory-panel">
            <h3>Agent Memory</h3>
            {memories.map((memory) => (
                <div key={memory.key} className="memory-item">
                    <strong>{memory.key}</strong>
                    <p>{memory.value.substring(0, 100)}...</p>
                    <span className="tags">{memory.tags.join(', ')}</span>
                </div>
            ))}
        </div>
    );
};
```

## Phase 3: Testing and Validation

### Step 3.1: Unit Tests

Create tests for the new tools:

```typescript
// Example test for memory_save
describe('memory_save', () => {
    it('should save a memory item successfully', async () => {
        const result = await memory_save('test_key', 'test_value', ['test']);
        expect(result).toContain('saved successfully');
    });
});
```

### Step 3.2: Integration Tests

Test the full flow:

1. Agent receives a task
2. Agent uses `memory_save` to persist information
3. Agent uses `memory_retrieve` to access saved information
4. Agent uses `data_analyze` to process a dataset
5. Agent uses `data_visualize` to create a chart

### Step 3.3: Manual Testing

1. Connect Supabase service in ECHOMEN settings
2. Give the agent a task that requires memory (e.g., "Remember my project goals: X, Y, Z")
3. Verify the memory is saved in Supabase
4. Give the agent a task that requires retrieval (e.g., "What are my project goals?")
5. Verify the agent retrieves and uses the saved memory

## Phase 4: Deployment Considerations

### Step 4.1: Environment Variables

Ensure the following environment variables are set in your deployment:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### Step 4.2: Database Migrations

Run the SQL migrations in your Supabase project to create the `memories` table.

### Step 4.3: Backend Dependencies

Ensure the backend has the required Python libraries:

```bash
pip install supabase python-dotenv pandas matplotlib
```

## Troubleshooting

### Memory Tools Not Working

1. Check that Supabase service is connected in ECHOMEN settings
2. Verify `SUPABASE_URL` and `SUPABASE_KEY` are set correctly
3. Check that the `memories` table exists in Supabase

### Data Analysis Tools Not Working

1. Verify Python 3 is installed in the sandbox
2. Check that Pandas and Matplotlib are installed
3. Ensure the analysis script is syntactically correct

## Next Steps

1. Implement the backend handlers for memory tools
2. Set up Supabase and create the `memories` table
3. Test the tools with sample tasks
4. Deploy to production with proper environment variables
5. Monitor agent performance and memory usage

---

**Last Updated:** November 10, 2025
**Status:** Implementation Guide Complete
