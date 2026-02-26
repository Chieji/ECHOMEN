# ECHOMEN Tool Integration Specification

This document outlines the specifications for two new toolsets to be integrated into the ECHOMEN autonomous AI agent: **Structured Memory Tools** and **Data Analysis Tools**. These tools are designed to enhance the agent's long-term learning, context management, and data processing capabilities.

## 1. Structured Memory Tools (Supabase Integration)

These tools will enable the agent to store and retrieve structured information, serving as the long-term memory and knowledge base. They will be implemented by calling a backend service that interacts with a Supabase PostgreSQL database.

### 1.1. `memory_save`

| Attribute | Value |
| :--- | :--- |
| **Function Name** | `memory_save` |
| **Description** | Stores a piece of structured information or a key-value pair into the agent's long-term memory. |
| **Parameters** | `key: string`, `value: string`, `tags: string[]` |
| **Parameter Details** | `key`: A unique identifier for the memory item (e.g., "user_project_goals"). `value`: The content to be stored (e.g., a JSON string or a long text block). `tags`: An array of strings for categorization (e.g., ["project", "config", "user_pref"]). |
| **Return Type** | `string` |
| **Return Value** | A confirmation message indicating success (e.g., "Memory item 'key' saved successfully."). |

### 1.2. `memory_retrieve`

| Attribute | Value |
| :--- | :--- |
| **Function Name** | `memory_retrieve` |
| **Description** | Retrieves a memory item based on its key or a set of tags. |
| **Parameters** | `key: string` (optional), `tags: string[]` (optional) |
| **Parameter Details** | `key`: The unique identifier of the memory item to retrieve. `tags`: An array of tags to search for relevant memory items. At least one of `key` or `tags` must be provided. |
| **Return Type** | `string` |
| **Return Value** | The retrieved content as a string (e.g., the `value` of the memory item). If multiple items match, a JSON array of results will be returned. If no item is found, an empty string or a descriptive error will be returned. |

### 1.3. `memory_delete`

| Attribute | Value |
| :--- | :--- |
| **Function Name** | `memory_delete` |
| **Description** | Deletes a memory item based on its key. |
| **Parameters** | `key: string` |
| **Parameter Details** | `key`: The unique identifier of the memory item to delete. |
| **Return Type** | `string` |
| **Return Value** | A confirmation message indicating success (e.g., "Memory item 'key' deleted successfully."). |

## 2. Data Analysis Tools (Python Integration)

These tools will leverage the `executeShellCommand` capability to run Python scripts with data analysis libraries (Pandas, Matplotlib) within the sandbox environment, providing structured data processing and visualization.

### 2.1. `data_analyze`

| Attribute | Value |
| :--- | :--- |
| **Function Name** | `data_analyze` |
| **Description** | Executes a Python script to perform data manipulation, cleaning, or statistical analysis on a specified file. |
| **Parameters** | `input_file_path: string`, `analysis_script: string` |
| **Parameter Details** | `input_file_path`: The path to the data file (e.g., CSV, JSON) in the sandbox. `analysis_script`: The full Python script to execute. The script MUST read the input file, perform the analysis, and print the final result (e.g., a summary table, a calculated value) to standard output. |
| **Return Type** | `string` |
| **Return Value** | The standard output of the executed Python script, containing the results of the analysis. |

### 2.2. `data_visualize`

| Attribute | Value |
| :--- | :--- |
| **Function Name** | `data_visualize` |
| **Description** | Executes a Python script to generate a data visualization (chart, graph) from a specified file and saves it as an image artifact. |
| **Parameters** | `input_file_path: string`, `visualization_script: string`, `output_image_path: string` |
| **Parameter Details** | `input_file_path`: The path to the data file in the sandbox. `visualization_script`: The full Python script to execute. The script MUST read the input file, generate the plot (using Matplotlib or similar), and save the image to the path specified by `output_image_path`. `output_image_path`: The path where the generated image (e.g., `.png`) will be saved in the sandbox. |
| **Return Type** | `string` |
| **Return Value** | A confirmation message including the path to the saved image artifact (e.g., "Visualization saved to: /path/to/chart.png"). |

---
**Next Step:** Implement the backend logic for these tools and update `services/tools.ts` with the new function declarations.


## Contract Ownership and Validation

To avoid drift between docs and runtime behavior:

- **Canonical contract source:** `services/tools.ts` (both `toolDeclarations` and `availableTools`).
- **Reference documentation:** this file (`tool_specifications.md`) describes intent and examples.
- **Cross-module type contracts:** `types.ts`.

Run `npm run check:tools` to verify every declared tool has a matching runtime implementation, and every implementation has a declaration.
