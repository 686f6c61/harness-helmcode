<!-- El archivo fuente en inglés está generado por scripts/gen-doc-graphs.ts; este archivo en español es la contraparte revisada mantenida mediante el emparejamiento bilingüe.
     Al actualizar, ejecutar primero `pnpm run gen-doc-graphs` para actualizar el inglés, después actualizar este archivo y ejecutar `pnpm run verify-translation-pairing --write docs/capability-seams.md` para volver a registrar el emparejamiento. -->

# Capability seams y servicios núcleo

[English](capability-seams.md) | Español

Un servicio puede ser un servicio núcleo de la espina dorsal, un capability seam reemplazable, un punto de bundle/composición o un servicio independiente. El grafo muestra el paquete que posee la declaración del servicio, los paquetes de implementación conocidos y los paquetes que consumen el servicio directamente.

```mermaid
flowchart LR
  pkg_hmr["hmr"]
  svc_hmr["ctx.hmr<br/>Serialized module and configuration reloads"]
  pkg_app_boot["app-boot"]
  pkg_client_ui_plugin_manager["client-ui-plugin-manager"]
  svc_pluginRegistryProbe["ctx.pluginRegistryProbe<br/>Host registry response comparison"]
  pkg_plugin_manager["plugin-manager"]
  svc_pluginManager["ctx.pluginManager<br/>Current-profile plugin and bundle management"]
  pkg_ui_settings_plugin_inventory["ui-settings-plugin-inventory"]
  svc_profileContext["ctx.profileContext<br/>Launcher-owned profile data"]
  pkg_client_connection["client-connection"]
  svc_connection["ctx.connection<br/>Authenticated browser transport"]
  pkg_api_gateway["api-gateway"]
  pkg_host_frontend_static["host-frontend-static"]
  pkg_mcp_resources["mcp-resources"]
  svc_mcpResources["ctx.mcpResources<br/>Scoped MCP resource access"]
  pkg_mcp_client["mcp-client"]
  pkg_browser_use["browser-use"]
  svc_browserUse["ctx.browserUse<br/>Browser-use provider registration"]
  pkg_experimental_browser_use_playwright_mcp["experimental-browser-use-playwright-mcp"]
  pkg_experimental_browser_use_chrome_devtools_mcp["experimental-browser-use-chrome-devtools-mcp"]
  pkg_experimental_browser_use_stagehand_native["experimental-browser-use-stagehand-native"]
  pkg_computer_use["computer-use"]
  svc_computerUse["ctx.computerUse<br/>Computer-use provider registration"]
  pkg_experimental_computer_use_cua_driver_mcp["experimental-computer-use-cua-driver-mcp"]
  pkg_experimental_computer_use_cua_driver_native["experimental-computer-use-cua-driver-native"]
  pkg_office_to_pdf["office-to-pdf"]
  svc_officeToPdf["ctx.officeToPdf<br/>Office to PDF conversion"]
  pkg_client_ui_sidebar_documentpreview["client-ui-sidebar-documentpreview"]
  pkg_attachment["attachment"]
  svc_attachments["ctx.attachments<br/>Durable binary attachment storage"]
  pkg_attachment_local["attachment-local"]
  pkg_api_session_controller["api-session-controller"]
  pkg_tool_fs["tool-fs"]
  pkg_llm_pi_ai["llm-pi-ai"]
  pkg_client_file_upload["client-file-upload"]
  svc_fileUploads["ctx.fileUploads<br/>Agent-scoped staged file uploads"]
  pkg_llm["llm"]
  svc_llm["ctx.llm<br/>LLM adapter registry"]
  pkg_llm_replay["llm-replay"]
  pkg_agent_loop["agent-loop"]
  pkg_compaction_basic["compaction-basic"]
  pkg_token_meter["token-meter"]
  svc_tokenMeter["ctx.tokenMeter<br/>Replay token measurement"]
  pkg_compaction_tool_result_pruner["compaction-tool-result-pruner"]
  svc_toolResultPruner["ctx.toolResultPruner<br/>Model-free tool-result pruning"]
  pkg_session["session"]
  svc_sessions["ctx.sessions<br/>In-memory session store"]
  pkg_agent["agent"]
  pkg_session_persistence["session-persistence"]
  pkg_session_query["session-query"]
  pkg_session_query_sqlite["session-query-sqlite"]
  pkg_subagent_in_process_driver["subagent-in-process-driver"]
  pkg_invariants["invariants"]
  pkg_message_feedback["message-feedback"]
  pkg_experimental_api_speech_to_text["experimental-api-speech-to-text"]
  svc_speechController["ctx.speechController<br/>Experimental transcription Remote"]
  svc_sessionController["ctx.sessionController<br/>Host Session Remote controller"]
  svc_sessionFileReferences["ctx.sessionFileReferences<br/>Session-addressed file-reference Remote adapter"]
  svc_sessionSkillCatalog["ctx.sessionSkillCatalog<br/>Session-addressed skill Remote adapter"]
  pkg_api_job_controller["api-job-controller"]
  svc_jobController["ctx.jobController<br/>Host job Remote controller"]
  pkg_api_settings_controller["api-settings-controller"]
  svc_credentialsController["ctx.credentialsController<br/>Host credential-surface Remote controller"]
  svc_settingsController["ctx.settingsController<br/>Host settings-surface Remote controller"]
  pkg_api_workspace_files["api-workspace-files"]
  svc_workspaceFiles["ctx.workspaceFiles<br/>Host workspace file Remote service"]
  pkg_workspace_changes["workspace-changes"]
  svc_workspaceChanges["ctx.workspaceChanges<br/>Host per-turn changed-file summaries"]
  pkg_api_terminal_controller["api-terminal-controller"]
  svc_terminalController["ctx.terminalController<br/>Session interactive terminal Remote controller"]
  pkg_api_workspace_controller["api-workspace-controller"]
  svc_workspaceController["ctx.workspaceController<br/>Host Workspace Remote controller"]
  svc_directoryPickerController["ctx.directoryPickerController<br/>Host directory-picking Remote controller"]
  svc_invariants["ctx.invariants<br/>Package-owned invariant registry"]
  pkg_scope["scope"]
  pkg_typert_registry["typert-registry"]
  svc_typert["ctx.typert<br/>Runtime type registry"]
  pkg_typert_loader["typert-loader"]
  svc_typertGateway["ctx.typertGateway<br/>Typert Host invocation gateway"]
  svc_sessionPersistence["ctx.sessionPersistence<br/>Durable session persistence seam"]
  pkg_session_persistence_jsonl["session-persistence-jsonl"]
  pkg_tool_bash["tool-bash"]
  pkg_hooks_claude_code["hooks-claude-code"]
  pkg_hooks_codex["hooks-codex"]
  pkg_config_editor["config-editor"]
  svc_configEditor["ctx.configEditor<br/>Profile configuration edits"]
  pkg_settings["settings"]
  pkg_agent_default_model["agent-default-model"]
  svc_settings["ctx.settings<br/>Plugin configuration forms"]
  pkg_tool_subagent["tool-subagent"]
  svc_subagentModelSelection["ctx.subagentModelSelection<br/>Subagent model-selection preference"]
  pkg_credentials["credentials"]
  svc_credentials["ctx.credentials<br/>Credential seam"]
  pkg_credentials_local["credentials-local"]
  pkg_authorization["authorization"]
  svc_authorization["ctx.authorization<br/>Authorization flow registry"]
  pkg_session_telemetry["session-telemetry"]
  svc_sessionTelemetry["ctx.sessionTelemetry<br/>Session telemetry seam"]
  pkg_storage["storage"]
  svc_storage["ctx.storage<br/>Non-session storage hub"]
  pkg_storage_json["storage-json"]
  pkg_storage_sqlite["storage-sqlite"]
  pkg_storage_domain["storage-domain"]
  svc_storageDomain["ctx.storageDomain<br/>Domain data facility"]
  pkg_workspace["workspace"]
  svc_messageFeedback["ctx.messageFeedback<br/>Lifecycle-bound message feedback"]
  pkg_command_feedback["command-feedback"]
  svc_sessionFeedback["ctx.sessionFeedback<br/>Session-level feedback recorder"]
  svc_workspaceRegistry["ctx.workspaceRegistry<br/>Workspace entity registry"]
  svc_sessionQuery["ctx.sessionQuery<br/>Session reads, traces, filters, and search"]
  pkg_session_reference["session-reference"]
  pkg_tool_session_query["tool-session-query"]
  pkg_file_reference["file-reference"]
  svc_fileReferences["ctx.fileReferences<br/>File reference discovery"]
  pkg_file_reference_local["file-reference-local"]
  svc_sessionReferenceResolver["ctx.sessionReferenceResolver<br/>Cross-session snapshot preparation"]
  pkg_session_title["session-title"]
  svc_sessionTitle["ctx.sessionTitle<br/>Log-backed session titles"]
  pkg_session_title_first_prompt_llm["session-title-first-prompt-llm"]
  pkg_session_title_all_prompts_llm["session-title-all-prompts-llm"]
  pkg_system_prompt["system-prompt"]
  svc_systemPrompt["ctx.systemPrompt<br/>System prompt assembly registry"]
  pkg_tools["tools"]
  pkg_tool_terminal["tool-terminal"]
  pkg_tool_web["tool-web"]
  svc_tools["ctx.tools<br/>Tool registry and guarded execution pipeline"]
  pkg_tool_ask_user["tool-ask-user"]
  pkg_tool_cordis["tool-cordis"]
  pkg_tool_skill["tool-skill"]
  pkg_tool_todo["tool-todo"]
  pkg_user_questions["user-questions"]
  svc_userQuestions["ctx.userQuestions<br/>Human question/answer seam"]
  pkg_plan_mode["plan-mode"]
  svc_planMode["ctx.planMode<br/>Plan collaboration state"]
  pkg_agent_preset_registry["agent-preset-registry"]
  svc_agentPresets["ctx.agentPresets<br/>Per-session agent composition"]
  pkg_commands["commands"]
  svc_commands["ctx.commands<br/>Human command registry"]
  pkg_session_projection["session-projection"]
  svc_sessionProjections["ctx.sessionProjections<br/>Session projection units"]
  pkg_session_projection_cache["session-projection-cache"]
  svc_sessionProjectionCache["ctx.sessionProjectionCache<br/>Persisted projection cache"]
  pkg_skill["skill"]
  svc_skills["ctx.skills<br/>Skill provider registry"]
  pkg_sandbox_windows_acl["sandbox-windows-acl"]
  pkg_skill_badge["skill-badge"]
  pkg_skill_filesystem["skill-filesystem"]
  pkg_skill_office["skill-office"]
  svc_agents["ctx.agents<br/>Agent service"]
  pkg_acp["acp"]
  svc_agentDefaultModel["ctx.agentDefaultModel<br/>Default Agent model selection"]
  pkg_headless["headless"]
  svc_agentLoop["ctx.agentLoop<br/>Concrete loop driver"]
  pkg_base["base"]
  pkg_sdk_minimal["sdk-minimal"]
  pkg_schedule["schedule"]
  svc_schedule["ctx.schedule<br/>Host scheduled messages"]
  pkg_goal["goal"]
  svc_goals["ctx.goals<br/>Same-session goal domain"]
  pkg_ssh["ssh"]
  svc_ssh["ctx.ssh<br/>POSIX SSH connection owner"]
  pkg_fs_ssh["fs-ssh"]
  pkg_subprocess_ssh["subprocess-ssh"]
  pkg_sandbox_ssh["sandbox-ssh"]
  pkg_subprocess["subprocess"]
  svc_subprocess["ctx.subprocess<br/>Subprocess seam"]
  pkg_subprocess_local["subprocess-local"]
  pkg_bash_local["bash-local"]
  pkg_bash_sandbox["bash-sandbox"]
  pkg_terminal_bash["terminal-bash"]
  pkg_lsp_stdio["lsp-stdio"]
  pkg_subagent_acp["subagent-acp"]
  pkg_subagent_codex["subagent-codex"]
  pkg_subagent_claude_code["subagent-claude-code"]
  pkg_shell["shell"]
  svc_shell["ctx.shell<br/>Bash executor seam"]
  pkg_pwsh_local["pwsh-local"]
  pkg_tool_pwsh["tool-pwsh"]
  pkg_shell_env["shell-env"]
  svc_shellEnv["ctx.shellEnv<br/>Managed bash environment registry"]
  pkg_terminal["terminal"]
  svc_terminals["ctx.terminals<br/>Persistent PTY session registry"]
  pkg_sandbox["sandbox"]
  svc_sandbox["ctx.sandbox<br/>Process-sandbox seam"]
  pkg_sandbox_local["sandbox-local"]
  pkg_sandbox_policy["sandbox-policy"]
  svc_sandboxPolicy["ctx.sandboxPolicy<br/>Sandbox policy home"]
  pkg_fs_sandbox["fs-sandbox"]
  pkg_user_approval["user-approval"]
  svc_approval["ctx.approval<br/>Approval seam"]
  pkg_permission_presets["permission-presets"]
  svc_permissionPresets["ctx.permissionPresets<br/>Permission presets"]
  pkg_ptc_runtime["ptc-runtime"]
  svc_ptcRuntime["ctx.ptcRuntime<br/>PTC execution seam"]
  pkg_ptc_runtime_node["ptc-runtime-node"]
  pkg_experimental_ptc_runtime_python["experimental-ptc-runtime-python"]
  pkg_workflow_ptc["workflow-ptc"]
  pkg_fs["fs"]
  svc_fs["ctx.fs<br/>Filesystem provider seam"]
  pkg_fs_local["fs-local"]
  pkg_fs_observation_policy["fs-observation-policy"]
  pkg_compaction["compaction"]
  svc_compaction["ctx.compaction<br/>Compaction seam"]
  pkg_subagent["subagent"]
  svc_subagents["ctx.subagents<br/>Subagent provider and continuation service"]
  pkg_subagent_spawn_in_process["subagent-spawn-in-process"]
  pkg_subagent_fork_in_process["subagent-fork-in-process"]
  pkg_subagent_dsh_sdk["subagent-dsh-sdk"]
  pkg_tool_subagent_control["tool-subagent-control"]
  pkg_tool_ralph["tool-ralph"]
  pkg_experimental_speech_to_text["experimental-speech-to-text"]
  svc_speechToText["ctx.speechToText<br/>Experimental speech recognition providers"]
  pkg_experimental_speech_to_text_sensevoice["experimental-speech-to-text-sensevoice"]
  pkg_experimental_agent_team["experimental-agent-team"]
  svc_agentTeams["ctx.agentTeams<br/>Agent Teams coordination domain"]
  pkg_experimental_tool_agent_team["experimental-tool-agent-team"]
  pkg_inspector["inspector"]
  svc_inspector["ctx.inspector<br/>Cross-realm runtime inspection"]
  pkg_jobs["jobs"]
  svc_jobs["ctx.jobs<br/>Background job registry"]
  pkg_jobs_local["jobs-local"]
  pkg_tool_jobs["tool-jobs"]
  pkg_web["web"]
  svc_web["ctx.web<br/>Web access provider registry"]
  pkg_web_search_exa["web-search-exa"]
  pkg_web_search_perplexity["web-search-perplexity"]
  pkg_web_search_brave["web-search-brave"]
  pkg_web_fetch_http["web-fetch-http"]
  pkg_spill["spill"]
  svc_spillStore["ctx.spillStore<br/>Spill storage seam"]
  pkg_spill_local["spill-local"]
  pkg_spill_policy["spill-policy"]
  pkg_host_directory_picker["host-directory-picker"]
  svc_directoryPicker["ctx.directoryPicker<br/>Workspace-directory picking seam"]
  pkg_host_directory_picker_native["host-directory-picker-native"]
  pkg_host_directory_picker_browse["host-directory-picker-browse"]
  pkg_host_webserver["host-webserver"]
  svc_webServer["ctx.webServer<br/>HTTP route registration"]
  pkg_client_modules["client-modules"]
  pkg_client_hmr["client-hmr"]
  svc_clientModules["ctx.clientModules<br/>Client plugin graph host"]
  pkg_workflow["workflow"]
  svc_workflowEngine["ctx.workflowEngine<br/>Workflow script engine"]
  pkg_tool_workflow["tool-workflow"]
  pkg_webhook["webhook"]
  svc_webhookRuntime["ctx.webhookRuntime<br/>Webhook rule runtime"]
  pkg_webhook_github["webhook-github"]
  pkg_lsp["lsp"]
  svc_lsp["ctx.lsp<br/>Language-server navigation seam"]
  pkg_tool_lsp["tool-lsp"]
  pkg_cordis_host_runner["cordis-host-runner"]
  svc_dynamicCordisRunner["ctx.dynamicCordisRunner<br/>Dynamic Cordis package host runner"]
  svc_cordisInspect["ctx.cordisInspect<br/>Dynamic Cordis inspect registry"]
  pkg_agent --> svc_agents
  pkg_agent_default_model --> svc_agentDefaultModel
  pkg_agent_loop --> svc_agentLoop
  pkg_agent_preset_registry --> svc_agentPresets
  pkg_api_gateway --> svc_typertGateway
  pkg_api_job_controller --> svc_jobController
  pkg_api_session_controller --> svc_sessionController
  pkg_api_session_controller --> svc_sessionFileReferences
  pkg_api_session_controller --> svc_sessionSkillCatalog
  pkg_api_settings_controller --> svc_credentialsController
  pkg_api_settings_controller --> svc_settingsController
  pkg_api_terminal_controller --> svc_terminalController
  pkg_api_workspace_controller --> svc_directoryPickerController
  pkg_api_workspace_controller --> svc_workspaceController
  pkg_api_workspace_files --> svc_workspaceFiles
  pkg_app_boot --> svc_profileContext
  pkg_attachment --> svc_attachments
  pkg_attachment_local --> svc_attachments
  pkg_authorization --> svc_authorization
  pkg_bash_local --> svc_shell
  pkg_bash_sandbox --> svc_shell
  pkg_browser_use --> svc_browserUse
  pkg_client_connection --> svc_connection
  pkg_client_file_upload --> svc_fileUploads
  pkg_client_modules --> svc_clientModules
  pkg_client_ui_plugin_manager --> svc_pluginRegistryProbe
  pkg_command_feedback --> svc_sessionFeedback
  pkg_commands --> svc_commands
  pkg_compaction --> svc_compaction
  pkg_compaction_basic --> svc_compaction
  pkg_compaction_tool_result_pruner --> svc_toolResultPruner
  pkg_computer_use --> svc_computerUse
  pkg_config_editor --> svc_configEditor
  pkg_cordis_host_runner --> svc_cordisInspect
  pkg_cordis_host_runner --> svc_dynamicCordisRunner
  pkg_credentials --> svc_credentials
  pkg_credentials_local --> svc_credentials
  pkg_experimental_agent_team --> svc_agentTeams
  pkg_experimental_api_speech_to_text --> svc_speechController
  pkg_experimental_browser_use_chrome_devtools_mcp --> svc_browserUse
  pkg_experimental_browser_use_playwright_mcp --> svc_browserUse
  pkg_experimental_browser_use_stagehand_native --> svc_browserUse
  pkg_experimental_computer_use_cua_driver_mcp --> svc_computerUse
  pkg_experimental_computer_use_cua_driver_native --> svc_computerUse
  pkg_experimental_ptc_runtime_python --> svc_ptcRuntime
  pkg_experimental_speech_to_text --> svc_speechToText
  pkg_experimental_speech_to_text_sensevoice --> svc_speechToText
  pkg_file_reference --> svc_fileReferences
  pkg_file_reference_local --> svc_fileReferences
  pkg_fs --> svc_fs
  pkg_fs_local --> svc_fs
  pkg_fs_sandbox --> svc_fs
  pkg_fs_ssh --> svc_fs
  pkg_goal --> svc_goals
  pkg_hmr --> svc_hmr
  pkg_host_directory_picker --> svc_directoryPicker
  pkg_host_directory_picker_browse --> svc_directoryPicker
  pkg_host_directory_picker_native --> svc_directoryPicker
  pkg_host_webserver --> svc_webServer
  pkg_inspector --> svc_inspector
  pkg_invariants --> svc_invariants
  pkg_jobs --> svc_jobs
  pkg_jobs_local --> svc_jobs
  pkg_llm --> svc_llm
  pkg_llm_pi_ai --> svc_llm
  pkg_llm_replay --> svc_llm
  pkg_lsp --> svc_lsp
  pkg_lsp_stdio --> svc_lsp
  pkg_mcp_client --> svc_mcpResources
  pkg_mcp_resources --> svc_mcpResources
  pkg_message_feedback --> svc_messageFeedback
  pkg_office_to_pdf --> svc_officeToPdf
  pkg_permission_presets --> svc_permissionPresets
  pkg_plan_mode --> svc_planMode
  pkg_plugin_manager --> svc_pluginManager
  pkg_ptc_runtime --> svc_ptcRuntime
  pkg_ptc_runtime_node --> svc_ptcRuntime
  pkg_pwsh_local --> svc_shell
  pkg_sandbox --> svc_sandbox
  pkg_sandbox_local --> svc_sandbox
  pkg_sandbox_policy --> svc_sandboxPolicy
  pkg_sandbox_ssh --> svc_sandbox
  pkg_sandbox_windows_acl --> svc_skills
  pkg_schedule --> svc_schedule
  pkg_session --> svc_sessions
  pkg_session_persistence --> svc_sessionPersistence
  pkg_session_persistence_jsonl --> svc_sessionPersistence
  pkg_session_projection --> svc_sessionProjections
  pkg_session_projection_cache --> svc_sessionProjectionCache
  pkg_session_query --> svc_sessionQuery
  pkg_session_query_sqlite --> svc_sessionQuery
  pkg_session_reference --> svc_sessionReferenceResolver
  pkg_session_telemetry --> svc_sessionTelemetry
  pkg_session_title --> svc_sessionTitle
  pkg_session_title_all_prompts_llm --> svc_sessionTitle
  pkg_session_title_first_prompt_llm --> svc_sessionTitle
  pkg_settings --> svc_settings
  pkg_shell --> svc_shell
  pkg_shell_env --> svc_shellEnv
  pkg_skill --> svc_skills
  pkg_skill_badge --> svc_skills
  pkg_skill_filesystem --> svc_skills
  pkg_skill_office --> svc_skills
  pkg_spill --> svc_spillStore
  pkg_spill_local --> svc_spillStore
  pkg_ssh --> svc_ssh
  pkg_storage --> svc_storage
  pkg_storage_domain --> svc_storageDomain
  pkg_storage_json --> svc_storage
  pkg_storage_sqlite --> svc_storage
  pkg_subagent --> svc_subagents
  pkg_subagent_acp --> svc_subagents
  pkg_subagent_claude_code --> svc_subagents
  pkg_subagent_codex --> svc_subagents
  pkg_subagent_dsh_sdk --> svc_subagents
  pkg_subagent_fork_in_process --> svc_subagents
  pkg_subagent_spawn_in_process --> svc_subagents
  pkg_subprocess --> svc_subprocess
  pkg_subprocess_local --> svc_subprocess
  pkg_subprocess_ssh --> svc_subprocess
  pkg_system_prompt --> svc_systemPrompt
  pkg_terminal --> svc_terminals
  pkg_terminal_bash --> svc_terminals
  pkg_token_meter --> svc_tokenMeter
  pkg_tool_subagent --> svc_subagentModelSelection
  pkg_tools --> svc_tools
  pkg_typert_registry --> svc_typert
  pkg_user_approval --> svc_approval
  pkg_user_questions --> svc_userQuestions
  pkg_web --> svc_web
  pkg_web_fetch_http --> svc_web
  pkg_web_search_brave --> svc_web
  pkg_web_search_exa --> svc_web
  pkg_web_search_perplexity --> svc_web
  pkg_webhook --> svc_webhookRuntime
  pkg_workflow --> svc_workflowEngine
  pkg_workflow_ptc --> svc_workflowEngine
  pkg_workspace --> svc_workspaceRegistry
  pkg_workspace_changes --> svc_workspaceChanges
  svc_agentDefaultModel --> pkg_api_session_controller
  svc_agentDefaultModel --> pkg_headless
  svc_agentLoop --> pkg_base
  svc_agentLoop --> pkg_sdk_minimal
  svc_agentTeams --> pkg_experimental_tool_agent_team
  svc_agents --> pkg_acp
  svc_agents --> pkg_agent_loop
  svc_agents --> pkg_subagent_in_process_driver
  svc_approval --> pkg_acp
  svc_approval --> pkg_tool_bash
  svc_approval --> pkg_tools
  svc_attachments --> pkg_api_session_controller
  svc_attachments --> pkg_llm_pi_ai
  svc_attachments --> pkg_tool_fs
  svc_authorization --> pkg_llm_pi_ai
  svc_browserUse --> pkg_experimental_browser_use_chrome_devtools_mcp
  svc_browserUse --> pkg_experimental_browser_use_playwright_mcp
  svc_browserUse --> pkg_experimental_browser_use_stagehand_native
  svc_clientModules --> pkg_client_hmr
  svc_compaction --> pkg_compaction_basic
  svc_computerUse --> pkg_experimental_computer_use_cua_driver_mcp
  svc_computerUse --> pkg_experimental_computer_use_cua_driver_native
  svc_configEditor --> pkg_agent_default_model
  svc_configEditor --> pkg_settings
  svc_connection --> pkg_api_gateway
  svc_connection --> pkg_host_frontend_static
  svc_cordisInspect --> pkg_tool_cordis
  svc_credentials --> pkg_api_settings_controller
  svc_credentials --> pkg_llm_pi_ai
  svc_directoryPicker --> pkg_api_workspace_controller
  svc_dynamicCordisRunner --> pkg_tool_cordis
  svc_fileReferences --> pkg_api_session_controller
  svc_fileUploads --> pkg_api_session_controller
  svc_fs --> pkg_tool_fs
  svc_hmr --> pkg_app_boot
  svc_invariants --> pkg_agent
  svc_invariants --> pkg_agent_loop
  svc_invariants --> pkg_scope
  svc_invariants --> pkg_session
  svc_jobs --> pkg_api_job_controller
  svc_jobs --> pkg_tool_bash
  svc_jobs --> pkg_tool_jobs
  svc_jobs --> pkg_tool_pwsh
  svc_jobs --> pkg_tool_subagent
  svc_jobs --> pkg_tool_terminal
  svc_llm --> pkg_agent_loop
  svc_llm --> pkg_compaction_basic
  svc_lsp --> pkg_tool_lsp
  svc_mcpResources --> pkg_mcp_resources
  svc_officeToPdf --> pkg_client_ui_sidebar_documentpreview
  svc_pluginManager --> pkg_plugin_manager
  svc_pluginManager --> pkg_ui_settings_plugin_inventory
  svc_pluginRegistryProbe --> pkg_client_ui_plugin_manager
  svc_profileContext --> pkg_plugin_manager
  svc_ptcRuntime --> pkg_tools
  svc_ptcRuntime --> pkg_workflow_ptc
  svc_sandbox --> pkg_bash_sandbox
  svc_sandbox --> pkg_terminal_bash
  svc_sandboxPolicy --> pkg_bash_sandbox
  svc_sandboxPolicy --> pkg_fs_sandbox
  svc_sandboxPolicy --> pkg_terminal_bash
  svc_sessionPersistence --> pkg_agent_loop
  svc_sessionPersistence --> pkg_hooks_claude_code
  svc_sessionPersistence --> pkg_hooks_codex
  svc_sessionPersistence --> pkg_message_feedback
  svc_sessionPersistence --> pkg_session_query
  svc_sessionPersistence --> pkg_session_query_sqlite
  svc_sessionPersistence --> pkg_tool_bash
  svc_sessionProjectionCache --> pkg_api_session_controller
  svc_sessionProjectionCache --> pkg_session_query
  svc_sessionProjectionCache --> pkg_session_reference
  svc_sessionProjections --> pkg_api_session_controller
  svc_sessionProjections --> pkg_session_title
  svc_sessionProjections --> pkg_tool_todo
  svc_sessionQuery --> pkg_session_reference
  svc_sessionQuery --> pkg_tool_session_query
  svc_sessions --> pkg_agent
  svc_sessions --> pkg_agent_loop
  svc_sessions --> pkg_invariants
  svc_sessions --> pkg_message_feedback
  svc_sessions --> pkg_session_persistence
  svc_sessions --> pkg_session_query
  svc_sessions --> pkg_session_query_sqlite
  svc_sessions --> pkg_subagent_in_process_driver
  svc_settings --> pkg_api_settings_controller
  svc_shell --> pkg_hooks_claude_code
  svc_shell --> pkg_hooks_codex
  svc_shell --> pkg_tool_bash
  svc_shell --> pkg_tool_pwsh
  svc_shellEnv --> pkg_tool_bash
  svc_shellEnv --> pkg_tool_pwsh
  svc_skills --> pkg_tool_skill
  svc_speechToText --> pkg_experimental_api_speech_to_text
  svc_spillStore --> pkg_spill_policy
  svc_ssh --> pkg_fs_ssh
  svc_ssh --> pkg_sandbox_ssh
  svc_ssh --> pkg_subprocess_ssh
  svc_storage --> pkg_storage_domain
  svc_storageDomain --> pkg_workspace
  svc_subagentModelSelection --> pkg_tool_subagent
  svc_subagents --> pkg_tool_ralph
  svc_subagents --> pkg_tool_subagent
  svc_subagents --> pkg_tool_subagent_control
  svc_subprocess --> pkg_bash_local
  svc_subprocess --> pkg_bash_sandbox
  svc_subprocess --> pkg_lsp_stdio
  svc_subprocess --> pkg_subagent_acp
  svc_subprocess --> pkg_subagent_claude_code
  svc_subprocess --> pkg_subagent_codex
  svc_subprocess --> pkg_terminal_bash
  svc_systemPrompt --> pkg_agent_loop
  svc_systemPrompt --> pkg_tool_fs
  svc_systemPrompt --> pkg_tool_terminal
  svc_systemPrompt --> pkg_tool_web
  svc_systemPrompt --> pkg_tools
  svc_terminals --> pkg_tool_terminal
  svc_tokenMeter --> pkg_compaction_basic
  svc_toolResultPruner --> pkg_compaction_basic
  svc_tools --> pkg_agent_loop
  svc_tools --> pkg_tool_ask_user
  svc_tools --> pkg_tool_bash
  svc_tools --> pkg_tool_cordis
  svc_tools --> pkg_tool_fs
  svc_tools --> pkg_tool_skill
  svc_tools --> pkg_tool_subagent
  svc_tools --> pkg_tool_terminal
  svc_tools --> pkg_tool_todo
  svc_tools --> pkg_tool_web
  svc_typert --> pkg_api_gateway
  svc_typert --> pkg_typert_loader
  svc_userQuestions --> pkg_tool_ask_user
  svc_web --> pkg_tool_web
  svc_webServer --> pkg_client_connection
  svc_webServer --> pkg_client_hmr
  svc_webServer --> pkg_client_modules
  svc_webhookRuntime --> pkg_webhook_github
  svc_workflowEngine --> pkg_tool_ralph
  svc_workflowEngine --> pkg_tool_workflow
  svc_workspaceRegistry --> pkg_api_session_controller
  svc_workspaceRegistry --> pkg_api_workspace_controller
  svc_fs -. event gate .-> pkg_fs_observation_policy
```

| clave ctx | Rol | Propietario | Implementaciones | Consumidores directos | Plugins complementarios | Nota |
| --- | --- | --- | --- | --- | --- | --- |
| `ctx.hmr` | `core` | [`hmr`](../packages/boot/hmr) | - | [`app-boot`](../packages/boot/app-boot) | - | Posee los watchers de módulos y de configuración exacta; las mutaciones de la aplicación comparten su cola y las recargas automáticas esperan el bloqueo de archivos de la aplicación. |
| `ctx.pluginRegistryProbe` | `core` | [`client-ui-plugin-manager`](../packages/client/ui-plugin-manager) | - | [`client-ui-plugin-manager`](../packages/client/ui-plugin-manager) | - | Compite entre las respuestas del registry público en el Host; el Client posee la recomendación inicial del registry. |
| `ctx.pluginManager` | `core` | [`plugin-manager`](../packages/boot/plugin-manager) | - | [`plugin-manager`](../packages/boot/plugin-manager), `ui-settings-plugin-inventory` | - | Comparte las operaciones de paquetes de perfil con el CLI e informa del estado persistido y en ejecución a los llamantes de Web y de agents. |
| `ctx.profileContext` | `core` | [`app-boot`](../packages/boot/app-boot) | - | [`plugin-manager`](../packages/boot/plugin-manager) | - | El lanzador de dsh suministra ubicaciones de perfiles solo de datos y entradas de composición; la programación de recargas pertenece a dsh-hmr. |
| `ctx.connection` | `core` | [`client-connection`](../packages/client/connection) | - | [`api-gateway`](../packages/api/gateway), [`host-frontend-static`](../packages/host/frontend-static) | - | Posee la autenticación del navegador y el despacho compartido de solicitudes HTTP; los adaptadores de API registran endpoints y flujos. |
| `ctx.mcpResources` | `seam` | [`mcp-resources`](../packages/mcp/mcp-resources) | [`mcp-client`](../packages/mcp/mcp-client) | [`mcp-resources`](../packages/mcp/mcp-resources) | - | Los proveedores propiedad de Connection sirven tools de recursos compartidos en el scope del agent llamante. |
| `ctx.browserUse` | `seam` | [`browser-use`](../packages/browser-use/browser-use) | [`experimental-browser-use-playwright-mcp`](../packages/experimental/browser-use-playwright-mcp), [`experimental-browser-use-chrome-devtools-mcp`](../packages/experimental/browser-use-chrome-devtools-mcp), [`experimental-browser-use-stagehand-native`](../packages/experimental/browser-use-stagehand-native) | [`experimental-browser-use-playwright-mcp`](../packages/experimental/browser-use-playwright-mcp), [`experimental-browser-use-chrome-devtools-mcp`](../packages/experimental/browser-use-chrome-devtools-mcp), [`experimental-browser-use-stagehand-native`](../packages/experimental/browser-use-stagehand-native) | - | Un nombre propiedad del proveedor por instancia de servicio. Los proveedores poseen sus tools y recursos de navegador por Session en vivo; el servicio compartido no tiene API de operaciones de navegador. |
| `ctx.computerUse` | `seam` | [`computer-use`](../packages/computer-use/computer-use) | [`experimental-computer-use-cua-driver-mcp`](../packages/experimental/computer-use-cua-driver-mcp), [`experimental-computer-use-cua-driver-native`](../packages/experimental/computer-use-cua-driver-native) | [`experimental-computer-use-cua-driver-mcp`](../packages/experimental/computer-use-cua-driver-mcp), [`experimental-computer-use-cua-driver-native`](../packages/experimental/computer-use-cua-driver-native) | - | Un nombre propiedad del proveedor por instancia de servicio. Cada proveedor también posee sus tools de modelo; el servicio no tiene API de acciones común, selección en runtime ni bloqueo de workflow de Session. |
| `ctx.officeToPdf` | `core` | [`office-to-pdf`](../packages/document/office-to-pdf) | - | [`client-ui-sidebar-documentpreview`](../packages/client/ui-sidebar-documentpreview) | - | Los bytes de Office autorizados se convierten en el Host usando el motor nativo del objetivo declarado, o WASM de Node cuando no se declara un objetivo nativo. |
| `ctx.attachments` | `seam` | [`attachment`](../packages/attachment/attachment) | [`attachment-local`](../packages/attachment/attachment-local) | [`api-session-controller`](../packages/api/session-controller), [`tool-fs`](../packages/fs/tool-fs), [`llm-pi-ai`](../packages/llm/llm-pi-ai) | - | El host confirma las imágenes aceptadas antes que los eventos de sesión; los adaptadores de proveedor resuelven las referencias duraderas autorizadas en contenido nativo del proveedor. |
| `ctx.fileUploads` | `core` | [`client-file-upload`](../packages/client/file-upload) | - | [`api-session-controller`](../packages/api/session-controller) | - | Posee la ingesta en flujo, el almacenamiento duradero y el tiempo de vida de los recibos preparados; el controlador de Session vincula los recibos a los envíos aceptados. |
| `ctx.llm` | `seam` | [`llm`](../packages/llm/llm) | [`llm-pi-ai`](../packages/llm/llm-pi-ai), [`llm-replay`](../packages/test-support/llm-replay) | [`agent-loop`](../packages/core/agent-loop), [`compaction-basic`](../packages/compaction/compaction-basic) | - | Los adaptadores registran implementaciones de proveedores; el loop y la compactación llaman al servicio de flujo agnóstico de proveedor. |
| `ctx.tokenMeter` | `core` | [`token-meter`](../packages/llm/token-meter) | - | [`compaction-basic`](../packages/compaction/compaction-basic) | - | Posee pliegues de reproducción aislados por sesión; los consumidores de presión comparten mediciones versionadas inmutables. |
| `ctx.toolResultPruner` | `core` | [`compaction-tool-result-pruner`](../packages/compaction/compaction-tool-result-pruner) | - | [`compaction-basic`](../packages/compaction/compaction-basic) | - | Reescribe los resultados de tool actuales sobredimensionados mediante reemplazos de superficie reproducibles de un solo nodo antes de la compactación por resumen. |
| `ctx.sessions` | `core` | [`session`](../packages/core/session) | - | [`agent-loop`](../packages/core/agent-loop), [`agent`](../packages/core/agent), [`session-persistence`](../packages/session/session-persistence), [`session-query`](../packages/session-query/session-query), [`session-query-sqlite`](../packages/session-query/session-query-sqlite), [`subagent-in-process-driver`](../packages/subagent/subagent-in-process-driver), [`invariants`](../packages/runtime-diagnostics/invariants), [`message-feedback`](../packages/feedback/message-feedback) | - | Posee las instancias de Session de solo anexado y emite el flujo duradero de eventos de sesión. |
| `ctx.speechController` | `core` | [`experimental-api-speech-to-text`](../packages/experimental/api-speech-to-text) | - | - | - | Valida el audio acotado del navegador antes del despacho al proveedor. |
| `ctx.sessionController` | `core` | [`api-session-controller`](../packages/api/session-controller) | - | - | - | Posee los comandos de Session, las lecturas en frío, el seguimiento de eventos duraderos, el estado de control en vivo, los catálogos de modelos, la apertura de espacios de trabajo y la política de activación de Agents. |
| `ctx.sessionFileReferences` | `core` | [`api-session-controller`](../packages/api/session-controller) | - | - | - | Delega el descubrimiento de referencias de archivos a través de la política establecida de lookup de Agents del Session Controller. |
| `ctx.sessionSkillCatalog` | `core` | [`api-session-controller`](../packages/api/session-controller) | - | - | - | Enumera los skills invocables por el usuario de la composición de la Session sin activar un Agent frío. |
| `ctx.jobController` | `core` | [`api-job-controller`](../packages/api/job-controller) | - | - | - | Transmite el registro de observación de una tarea en segundo plano por el espacio de nombres Remote generado; la lista permanece en el flujo de control de sesión. |
| `ctx.credentialsController` | `core` | [`api-settings-controller`](../packages/api/settings-controller) | - | - | - | Proyecta el seam de referencias de credenciales sobre el espacio de nombres Remote generado: la ramificación por lotes, la proyección de vistas y el mapeo de rechazos viven aquí, no en la Definition del seam. |
| `ctx.settingsController` | `core` | [`api-settings-controller`](../packages/api/settings-controller) | - | - | - | Proyecta el seam de configuración de usuario sobre el espacio de nombres Remote generado: la lectura siempre está redactada y cada rechazo se clasifica aquí, no en la Definition del seam. |
| `ctx.workspaceFiles` | `core` | [`api-workspace-files`](../packages/api/workspace-files) | - | - | - | Sirve stat, texto paginado, ventanas de bytes, listados de directorios y el flujo de cambios de los archivos dentro de la raíz de espacio de trabajo de una Session, confinado por lstat, contención y una segunda comprobación de stat. |
| `ctx.workspaceChanges` | `core` | [`workspace-changes`](../packages/deliverables/workspace-changes) | - | - | - | Sirve el resumen que anunció cada evento workspace/changes y la comparación entre inicio y fin de turno de cada archivo listado, por Session y secuencia de eventos, hasta que esa Session se libera; el registro solo porta el turno. |
| `ctx.terminalController` | `core` | [`api-terminal-controller`](../packages/api/terminal-controller) | - | - | - | Posee los procesos de terminal de usuario, la resolución del shell por defecto y la recuperación acotada de pantalla a través del proveedor de subprocesos y el transporte Remote tipado. |
| `ctx.workspaceController` | `core` | [`api-workspace-controller`](../packages/api/workspace-controller) | - | - | - | Posee los comandos de Workspace y la entrega de estado de Workspace segura ante reconexiones a través del espacio de nombres Remote generado. |
| `ctx.directoryPickerController` | `core` | [`api-workspace-controller`](../packages/api/workspace-controller) | - | - | - | Lleva el seam de selección al cable: la limitación por capacidad, la cancelación y los fallos codificados del seam que discrimina un flujo de directorios del navegador. |
| `ctx.invariants` | `core` | [`invariants`](../packages/runtime-diagnostics/invariants) | - | [`session`](../packages/core/session), [`agent`](../packages/core/agent), [`scope`](../packages/core/scope), [`agent-loop`](../packages/core/agent-loop) | - | Las subrutas complementarias registran comprobaciones locales al propietario; el servicio posee la selección, la unicidad, los fibers hijos y los fallos atribuidos a paquetes. |
| `ctx.typert` | `core` | [`typert-registry`](../packages/typert/registry) | - | [`typert-loader`](../packages/typert/loader), [`api-gateway`](../packages/api/gateway) | - | Los plugins registran contribuciones zod en vivo directamente o mediante dsh-typert-loader; la puerta de enlace de API consume descriptores de invocación y proveedores, mientras que otros consumidores de runtime consultan schemas y metadatos de reflexión en sus propios bordes. |
| `ctx.typertGateway` | `core` | [`api-gateway`](../packages/api/gateway) | - | - | - | Asocia los descriptores Remote generados con servicios de Cordis en vivo, resuelve las identidades registradas y expone llamadas unarias a través del portador RPC de Connection compartido. |
| `ctx.sessionPersistence` | `seam` | [`session-persistence`](../packages/session/session-persistence) | [`session-persistence-jsonl`](../packages/session/session-persistence-jsonl) | [`agent-loop`](../packages/core/agent-loop), [`tool-bash`](../packages/shell/tool-bash), [`hooks-claude-code`](../packages/hooks/hooks-claude-code), [`hooks-codex`](../packages/hooks/hooks-codex), [`session-query`](../packages/session-query/session-query), [`session-query-sqlite`](../packages/session-query/session-query-sqlite), [`message-feedback`](../packages/feedback/message-feedback) | - | El backend JSONL persiste el vocabulario SessionEvent como un artefacto por Session. |
| `ctx.configEditor` | `core` | [`config-editor`](../packages/boot/config-editor) | - | [`settings`](../packages/settings/settings), [`agent-default-model`](../packages/core/agent-default-model) | - | Persiste los parches de configuración de perfiles bajo el bloqueo de archivos de la aplicación y la cola de HMR, y después reconcilia las entradas del Loader. |
| `ctx.settings` | `core` | [`settings`](../packages/settings/settings) | - | [`api-settings-controller`](../packages/api/settings-controller) | - | Los formularios proyectan los campos Config volátiles de las entradas de perfil activas y delegan las ediciones validadas a config-editor. Los plugins consumen sus propias referencias Config. |
| `ctx.subagentModelSelection` | `core` | [`tool-subagent`](../packages/subagent/tool-subagent) | - | [`tool-subagent`](../packages/subagent/tool-subagent) | - | Posee el espacio de nombres de configuración desactivado por defecto que los tools de delegación con scope de Agent muestrean al componer una nueva Session de nivel superior. |
| `ctx.credentials` | `seam` | [`credentials`](../packages/credentials/credentials) | [`credentials-local`](../packages/credentials/credentials-local) | [`api-settings-controller`](../packages/api/settings-controller), [`llm-pi-ai`](../packages/llm/llm-pi-ai) | - | La configuración porta referencias a secretos; los proveedores poseen los valores. Los consumidores resuelven por operación, de modo que una credencial rotada llega a la solicitud inmediatamente siguiente; el controlador de configuración expone vistas sin valores y almacenamiento de solo escritura. |
| `ctx.authorization` | `seam` | [`authorization`](../packages/credentials/authorization) | - | [`llm-pi-ai`](../packages/llm/llm-pi-ai) | - | Los flujos los registra el plugin que sabe cómo obtener una credencial y se indexan por el registro que escriben; el seam posee la conversación y el ciclo de vida de un intento por clave, nunca el protocolo. |
| `ctx.sessionTelemetry` | `seam` | [`session-telemetry`](../packages/session/session-telemetry) | - | - | - | El seam captura, redacta y entrega los registros de sesión a un backend que el despliegue monte; Helmcode no incluye ninguno y los registros permanecen en la máquina. |
| `ctx.storage` | `seam` | [`storage`](../packages/storage/storage) | [`storage-json`](../packages/storage/storage-json), [`storage-sqlite`](../packages/storage/storage-sqlite) | [`storage-domain`](../packages/storage/storage-domain) | - | Los backends se registran lado a lado bajo nombres; las formas de datos (dominio primero) se montan en el hub y traducen las operaciones tipadas a primitivas opacas de unidades KV. |
| `ctx.storageDomain` | `core` | [`storage-domain`](../packages/storage/storage-domain) | - | [`workspace`](../packages/workspace/workspace) | - | Espera a cada backend configurado y después publica la forma de dominio como un único servicio vinculado al ciclo de vida para el estado duradero tipado. |
| `ctx.messageFeedback` | `core` | [`message-feedback`](../packages/feedback/message-feedback) | - | - | - | Posee el feedback por mensaje de assistant en el registro canónico de la Session, la validación del objetivo, el compare-and-set por elemento y el contrato Remote unario del Host. El feedback permanece fuera del historial del modelo; la exportación del registro sigue la política del consumidor. |
| `ctx.sessionFeedback` | `core` | [`command-feedback`](../packages/feedback/command-feedback) | - | - | - | Registra una observación a nivel de Session con su categoría como un evento feedback/record de solo registro en una Session en vivo a través del contrato Remote unario del Host; el comando /feedback comparte el mismo productor. |
| `ctx.workspaceRegistry` | `core` | [`workspace`](../packages/workspace/workspace) | - | [`api-workspace-controller`](../packages/api/workspace-controller), [`api-session-controller`](../packages/api/session-controller) | - | Posee los registros con marca WorkspaceId sobre la facilidad de dominio; las cuentas de sessionIds estables dirigen las proyecciones de RPC del Host y de la GUI. |
| `ctx.sessionQuery` | `seam` | [`session-query`](../packages/session-query/session-query) | [`session-query-sqlite`](../packages/session-query/session-query-sqlite) | [`session-reference`](../packages/context/session-reference), [`tool-session-query`](../packages/session-query/tool-session-query) | - | La interfaz suministra lecturas exactas, filtros y trazas; su backend concreto añade reconciliación de texto completo, ranking, snippets y generaciones de cursores, mientras que el consumidor de modelo posee la autoridad del espacio de trabajo y el renderizado sin cursores. |
| `ctx.fileReferences` | `seam` | [`file-reference`](../packages/context/file-reference) | [`file-reference-local`](../packages/context/file-reference-local) | [`api-session-controller`](../packages/api/session-controller) | - | La interfaz devuelve candidatos de completado de solo rutas dentro del cwd de un Agent; los proveedores poseen el acceso al espacio de nombres y el ranking sin leer el contenido de los archivos. |
| `ctx.sessionReferenceResolver` | `core` | [`session-reference`](../packages/context/session-reference) | - | - | - | Proyecta snapshots acotados de la conversación de la superficie actual en contexto de mensajes duradero y no confiable; los adaptadores del host poseen la sintaxis de menciones. |
| `ctx.sessionTitle` | `seam` | [`session-title`](../packages/session/session-title) | [`session-title-first-prompt-llm`](../packages/session/session-title-first-prompt-llm), [`session-title-all-prompts-llm`](../packages/session/session-title-all-prompts-llm) | - | - | Posee el fallback determinista, el pliegue del último título y el único registro opcional de proveedor asíncrono. |
| `ctx.systemPrompt` | `core` | [`system-prompt`](../packages/core/system-prompt) | - | [`agent-loop`](../packages/core/agent-loop), [`tools`](../packages/core/tools), [`tool-fs`](../packages/fs/tool-fs), [`tool-terminal`](../packages/terminal/tool-terminal), [`tool-web`](../packages/web/tool-web) | - | Recoge las secciones de prompt y los schemas de tools orientados al modelo para cada paso. |
| `ctx.tools` | `core` | [`tools`](../packages/core/tools) | - | [`agent-loop`](../packages/core/agent-loop), [`tool-ask-user`](../packages/interaction/tool-ask-user), [`tool-bash`](../packages/shell/tool-bash), [`tool-cordis`](../packages/extensions/tool-cordis), [`tool-fs`](../packages/fs/tool-fs), [`tool-terminal`](../packages/terminal/tool-terminal), [`tool-skill`](../packages/skill/tool-skill), [`tool-subagent`](../packages/subagent/tool-subagent), [`tool-todo`](../packages/todo/tool-todo), [`tool-web`](../packages/web/tool-web) | - | Registra capacidades, posee el transporte del modo PTC y enruta las llamadas a través de la pre-política, las guardas monótonas, el despacho envolvente, la post-política y la observación del resultado final. |
| `ctx.userQuestions` | `seam` | [`user-questions`](../packages/interaction/user-questions) | - | [`tool-ask-user`](../packages/interaction/tool-ask-user) | - | Los front ends de UI proporcionan el proveedor activo de respuestas humanas; tool-ask-user pausa una llamada a tool sobre la promesa ask() agnóstica de proveedor. |
| `ctx.planMode` | `core` | [`plan-mode`](../packages/plan/plan-mode) | - | - | - | Pliega el estado plan/mode registrado, vacía las selecciones de usuario en los límites de turno, renderiza la guía propiedad del despliegue, registra /plan y mantiene el schema de salida de plan estable entre transiciones. |
| `ctx.agentPresets` | `core` | [`agent-preset-registry`](../packages/preset/agent-preset-registry) | - | - | - | Monta anticipadamente las revisiones de presets declaradas en YAML, vincula Agents y lectores fríos a las contribuciones con scope y retiene las revisiones retiradas hasta que su último usuario las libera. |
| `ctx.commands` | `core` | [`commands`](../packages/interaction/commands) | - | - | - | Los plugins registran comandos humanos directos sin enviar invocaciones al modelo. |
| `ctx.sessionProjections` | `core` | [`session-projection`](../packages/session/session-projection) | - | [`api-session-controller`](../packages/api/session-controller), [`tool-todo`](../packages/todo/tool-todo), [`session-title`](../packages/session/session-title) | - | Los dominios registran unidades de pliegue dirigidas por estado; el impulso anticipado mantiene estados de marca de agua por sesión y el controlador de Session sirve líneas base y empuja los valores cambiados. |
| `ctx.sessionProjectionCache` | `core` | [`session-projection-cache`](../packages/session/session-projection-cache) | - | [`api-session-controller`](../packages/api/session-controller), [`session-query`](../packages/session-query/session-query), [`session-reference`](../packages/context/session-reference) | - | Establece puntos de control duraderos de los estados de las unidades de proyección por sesión (puntos obligatorios limitados + turn/end/detach), sirve vistas de proyección cacheadas y acelera la hidratación de proyecciones de Sessions preparadas. |
| `ctx.skills` | `seam` | [`skill`](../packages/skill/skill) | [`sandbox-windows-acl`](../packages/sandbox/sandbox-windows-acl), [`skill-badge`](../packages/skill/skill-badge), [`skill-filesystem`](../packages/skill/skill-filesystem), [`skill-office`](../packages/skill/skill-office) | [`tool-skill`](../packages/skill/tool-skill) | - | Fusiona los catálogos de skills de los proveedores; tool-skill renderiza el catálogo del prefijo de sesión y carga los cuerpos completos de los skills. |
| `ctx.agents` | `core` | [`agent`](../packages/core/agent) | - | [`agent-loop`](../packages/core/agent-loop), [`acp`](../packages/acp/acp), [`subagent-in-process-driver`](../packages/subagent/subagent-in-process-driver) | - | Posee los identificadores de Agent en vivo, el seam de fábrica create/resume y la propagación del iniciador local al proceso. |
| `ctx.agentDefaultModel` | `core` | [`agent-default-model`](../packages/core/agent-default-model) | - | [`api-session-controller`](../packages/api/session-controller), [`headless`](../packages/bundle/headless) | - | Lee el ModelSelection por defecto de la Config volátil y guarda las selecciones a través del editor de perfiles. |
| `ctx.agentLoop` | `bundle` | [`agent-loop`](../packages/core/agent-loop) | - | [`base`](../packages/bundle/base), [`sdk-minimal`](../packages/bundle/sdk-minimal) | - | El único plugin de loop concreto; los paquetes de extensión dependen de los eventos y servicios de dsh-agent, no de este paquete. |
| `ctx.schedule` | `core` | [`schedule`](../packages/schedule/schedule) | - | - | - | Almacena tareas independientemente de la activación de la Session y encola los mensajes vencidos en la Session original. |
| `ctx.goals` | `core` | [`goal`](../packages/goal/goal) | - | - | - | Pliega el estado versionado del objetivo a partir del registro de sesión y mantiene la activación de continuación en vivo local al proceso. |
| `ctx.ssh` | `core` | [`ssh`](../packages/ssh/ssh) | - | [`fs-ssh`](../packages/ssh/fs-ssh), [`subprocess-ssh`](../packages/ssh/subprocess-ssh), [`sandbox-ssh`](../packages/ssh/sandbox-ssh) | - | Posee una conexión OpenSSH autenticada, la identidad del helper instalado, los flujos de programa independientes y la limpieza de desconexión para los proveedores remotos emparejados. |
| `ctx.subprocess` | `seam` | [`subprocess`](../packages/subprocess/subprocess) | [`subprocess-local`](../packages/subprocess/subprocess-local), [`subprocess-ssh`](../packages/ssh/subprocess-ssh) | [`bash-local`](../packages/shell/bash-local), [`bash-sandbox`](../packages/shell/bash-sandbox), [`terminal-bash`](../packages/terminal/terminal-bash), [`lsp-stdio`](../packages/lsp/lsp-stdio), [`subagent-acp`](../packages/subagent/subagent-acp), [`subagent-codex`](../packages/subagent/subagent-codex), [`subagent-claude-code`](../packages/subagent/subagent-claude-code) | - | Los ejecutores de bash, el backend de shell PTY, el host de LSP y los backends de subagents ACP, Codex y Claude Code fuera de proceso hacen spawn a través de ctx.subprocess; el servicio posee las coordenadas de proceso, el tiempo de vida de árbol/sesión, las disposiciones de stdio, la mecánica de terminal y la escalada de kill. |
| `ctx.shell` | `seam` | [`shell`](../packages/shell/shell) | [`bash-local`](../packages/shell/bash-local), [`bash-sandbox`](../packages/shell/bash-sandbox), [`pwsh-local`](../packages/shell/pwsh-local) | [`tool-bash`](../packages/shell/tool-bash), [`tool-pwsh`](../packages/shell/tool-pwsh), [`hooks-claude-code`](../packages/hooks/hooks-claude-code), [`hooks-codex`](../packages/hooks/hooks-codex) | - | Los tools de shell orientados al modelo y los puentes de hooks consumen este seam; los ejecutores en sandbox, remotos o de PowerShell reemplazan a bash-local sin tocarlos. |
| `ctx.shellEnv` | `core` | [`shell-env`](../packages/shell/shell-env) | - | [`tool-bash`](../packages/shell/tool-bash), [`tool-pwsh`](../packages/shell/tool-pwsh) | - | Los plugins declaran hechos DSH_* con scope de efecto; cada tool de shell recoge un snapshot confiable por ejecución y su ejecutor reconstruye el espacio de nombres. |
| `ctx.terminals` | `seam` | [`terminal`](../packages/terminal/terminal) | [`terminal-bash`](../packages/terminal/terminal-bash) | [`tool-terminal`](../packages/terminal/tool-terminal) | - | El registry posee la identidad de sesión exacta por Agent y la limpieza; los backends poseen la mecánica de terminal, mientras que tool-terminal expone los tools de modelo con scope del propietario. |
| `ctx.sandbox` | `seam` | [`sandbox`](../packages/sandbox/sandbox) | [`sandbox-local`](../packages/sandbox/sandbox-local), [`sandbox-ssh`](../packages/ssh/sandbox-ssh) | [`bash-sandbox`](../packages/shell/bash-sandbox), [`terminal-bash`](../packages/terminal/terminal-bash) | - | Los consumidores entregan el argv exacto que están a punto de lanzar con spawn; los backends que comparten sistema de archivos y kernel con el anfitrión lo envuelven bajo una política por llamada e informan de la aplicación. |
| `ctx.sandboxPolicy` | `core` | [`sandbox-policy`](../packages/sandbox/sandbox-policy) | - | [`bash-sandbox`](../packages/shell/bash-sandbox), [`fs-sandbox`](../packages/fs/fs-sandbox), [`terminal-bash`](../packages/terminal/terminal-bash) | - | El único hogar del modo por defecto del despliegue + la raíz del espacio de trabajo; solo el ejecutor y el proveedor en sandbox leen el servicio (las capas de tools usan el pliegue puro `sandbox/mode` que también exporta). Ambas familias aplicadoras lo leen para que bash y fs no puedan confinar a raíces distintas. |
| `ctx.approval` | `seam` | [`user-approval`](../packages/interaction/user-approval) | - | [`tools`](../packages/core/tools), [`tool-bash`](../packages/shell/tool-bash), [`acp`](../packages/acp/acp) | - | Decisiones de permiso de un solo uso despachadas por el waterfall `approval/request`; los respondedores son listeners (el puente ACP para sus propios agents), y la ausencia falla cerrada a `unavailable`. |
| `ctx.permissionPresets` | `core` | [`permission-presets`](../packages/interaction/permission-presets) | - | - | - | Tabla de presets orientada al usuario (`workspace-write`/`danger-full-access`) que agrupa los controles de modo de sandbox y de política de aprobación; un cambio escribe un evento `permission/preset` hacia ambos eventos de control. |
| `ctx.ptcRuntime` | `seam` | [`ptc-runtime`](../packages/ptc-runtime/ptc-runtime) | [`ptc-runtime-node`](../packages/ptc-runtime/ptc-runtime-node), [`experimental-ptc-runtime-python`](../packages/experimental/ptc-runtime-python) | [`tools`](../packages/core/tools), [`workflow-ptc`](../packages/workflow/workflow-ptc) | - | Ejecuta programas contra vinculaciones asíncronas proporcionadas por el host; tools posee la presentación de PTC y workflow-ptc posee la orquestación de workflows. |
| `ctx.fs` | `seam` | [`fs`](../packages/fs/fs) | [`fs-local`](../packages/fs/fs-local), [`fs-sandbox`](../packages/fs/fs-sandbox), [`fs-ssh`](../packages/ssh/fs-ssh) | [`tool-fs`](../packages/fs/tool-fs) | [`fs-observation-policy`](../packages/fs/fs-observation-policy) | tool-fs ejecuta lectura/escritura/edición a través de ctx.fs; fs-sandbox cerca las mutaciones según el modo de sandbox compartido; fs-observation-policy contribuye comprobaciones de estado observado a través de la puerta de eventos fs/*. |
| `ctx.compaction` | `seam` | [`compaction`](../packages/compaction/compaction) | [`compaction-basic`](../packages/compaction/compaction-basic) | [`compaction-basic`](../packages/compaction/compaction-basic) | - | El backend básico consume los eventos de presión post-paso y de recuperación de errores de solicitud; no existe un tool compact orientado al modelo. |
| `ctx.subagents` | `seam` | [`subagent`](../packages/subagent/subagent) | [`subagent-spawn-in-process`](../packages/subagent/subagent-spawn-in-process), [`subagent-fork-in-process`](../packages/subagent/subagent-fork-in-process), [`subagent-acp`](../packages/subagent/subagent-acp), [`subagent-codex`](../packages/subagent/subagent-codex), [`subagent-claude-code`](../packages/subagent/subagent-claude-code), [`subagent-dsh-sdk`](../packages/subagent/subagent-dsh-sdk) | [`tool-subagent`](../packages/subagent/tool-subagent), [`tool-subagent-control`](../packages/subagent/tool-subagent-control), [`tool-ralph`](../packages/workflow/tool-ralph) | - | Los proveedores implementan transportes; el servicio también posee la orquestación opcional de continuación basada en Activation, tool-subagent selecciona la delegación de una sola pasada o continuable, tool-subagent-control entrega los seguimientos, y tool-ralph requiere una ruta nueva de salida estructurada. |
| `ctx.speechToText` | `seam` | [`experimental-speech-to-text`](../packages/experimental/speech-to-text) | [`experimental-speech-to-text-sensevoice`](../packages/experimental/speech-to-text-sensevoice) | [`experimental-api-speech-to-text`](../packages/experimental/api-speech-to-text) | - | Enruta los reconocedores explícitos; el navegador usa el Remote autenticado y conserva los transcripts en el borrador hasta el envío. |
| `ctx.agentTeams` | `core` | [`experimental-agent-team`](../packages/experimental/agent-team) | - | [`experimental-tool-agent-team`](../packages/experimental/tool-agent-team) | - | Posee la plantilla de raíz implícita, el buzón duradero entre pares, el DAG de tareas compartido y el ciclo de vida de los hijos continuables; tool-agent-team contribuye los controles de modelo. |
| `ctx.inspector` | `core` | `inspector` | - | - | - | Posee el objetivo CDP hospedado en el Worker y la API de observación y consulta del árbol de Cordis de Host y Client independiente del transporte. |
| `ctx.jobs` | `seam` | [`jobs`](../packages/jobs/jobs) | [`jobs-local`](../packages/jobs/jobs-local) | [`tool-bash`](../packages/shell/tool-bash), [`tool-pwsh`](../packages/shell/tool-pwsh), [`tool-terminal`](../packages/terminal/tool-terminal), [`tool-subagent`](../packages/subagent/tool-subagent), [`tool-jobs`](../packages/jobs/tool-jobs), [`api-job-controller`](../packages/api/job-controller) | - | Los productores (bash/pwsh en segundo plano, envíos PTY y delegaciones de subagents) registran el trabajo en ejecución; las tareas que declaran registro además transmiten salida en crudo para observadores no consumidores; tool-jobs es el controlador orientado al modelo que la lee, lista y mata; jobs-local es el registry local al proceso. |
| `ctx.web` | `seam` | [`web`](../packages/web/web) | [`web-search-exa`](../packages/web/web-search-exa), [`web-search-perplexity`](../packages/web/web-search-perplexity), [`web-search-brave`](../packages/web/web-search-brave), [`web-fetch-http`](../packages/web/web-fetch-http) | [`tool-web`](../packages/web/tool-web) | - | Los proveedores de búsqueda y de fetch se registran en un único seam ctx.web; tool-web posee los nombres estables orientados al modelo. |
| `ctx.spillStore` | `seam` | [`spill`](../packages/spill/spill) | [`spill-local`](../packages/spill/spill-local) | [`spill-policy`](../packages/spill/spill-policy) | - | El backend guarda el texto de tool sobredimensionado y devuelve un localizador orientado al modelo más una pista de recuperación; spill-policy es el consumidor de tools/post-execute que decide cuándo hacer spill. |
| `ctx.directoryPicker` | `seam` | [`host-directory-picker`](../packages/host/directory-picker) | [`host-directory-picker-native`](../packages/host/directory-picker-native), [`host-directory-picker-browse`](../packages/host/directory-picker-browse) | [`api-workspace-controller`](../packages/api/workspace-controller) | - | Capacidad de interacción discriminada: el backend nativo abre un selector del SO en la pantalla del host, el backend browse sirve primitivas de listado y creación para el navegador dentro de la aplicación; los backends de doble cara rellenan los slots de flujo de directorios de ui-workspace desde sus mitades de navegador (sin anuncio por el cable). |
| `ctx.webServer` | `core` | [`host-webserver`](../packages/host/webserver) | - | [`client-connection`](../packages/client/connection), [`client-modules`](../packages/client/modules), [`client-hmr`](../packages/client/hmr) | - | Portador node:http simple: registry de rutas con nombre, taps de transformación del índice y el fallback estático de dist; los plugins de transporte web registran sus propias rutas. |
| `ctx.clientModules` | `core` | [`client-modules`](../packages/client/modules) | - | [`client-hmr`](../packages/client/hmr) | - | Compone el grafo de entrada __DSH_BOOT__ a partir de un escaneo incremental de dsh.client, sirve los paquetes de plugins y notifica a los suscriptores de recompilación y de grafo cambiado. |
| `ctx.workflowEngine` | `seam` | [`workflow`](../packages/workflow/workflow) | [`workflow-ptc`](../packages/workflow/workflow-ptc) | [`tool-workflow`](../packages/workflow/tool-workflow), [`tool-ralph`](../packages/workflow/tool-ralph) | - | Un motor por contexto, como en bash, sin registry de proveedores con nombre; los consumidores generales de workflow y el fijo Ralph inician ejecuciones cuyas llamadas agent() se ramifican a través de ctx.subagents. |
| `ctx.webhookRuntime` | `core` | [`webhook`](../packages/webhook/webhook) | - | [`webhook-github`](../packages/webhook/webhook-github) | - | Los adaptadores de proveedor despachan las entregas autenticadas; los plugins de confianza registran reglas independientes locales al proceso, y el runtime convierte los resultados no nulos en Sessions ordinarias respaldadas por Workspace sin estado de entrega ni de finalización. |
| `ctx.lsp` | `seam` | [`lsp`](../packages/lsp/lsp) | [`lsp-stdio`](../packages/lsp/lsp-stdio) | [`tool-lsp`](../packages/lsp/tool-lsp) | - | Registro y selección de proveedores más ejecución normalizada de consultas sobre exactamente cuatro operaciones; el seam no ofrece escotilla de escape del protocolo, así que un backend traduce a la solicitud y al resultado normalizados. |
| `ctx.dynamicCordisRunner` | `core` | [`cordis-host-runner`](../packages/extensions/cordis-host-runner) | - | [`tool-cordis`](../packages/extensions/tool-cordis) | - | Posee el registry de definiciones en memoria, el sandbox vm para las mitades de host y el viaje de ida y vuelta de request-run; las páginas del navegador alcanzan el mismo servicio por el cable a través de su espacio de nombres remoto. |
| `ctx.cordisInspect` | `core` | [`cordis-host-runner`](../packages/extensions/cordis-host-runner) | - | [`tool-cordis`](../packages/extensions/tool-cordis) | - | Registra los proveedores de inspección del host, refleja el manifest de proveedores del cliente y enruta las consultas del cliente a través del transporte dinámico de Cordis. |

Modo de mantenimiento de la fuente en inglés: híbrido: los servicios se descubren a partir de las declaraciones de Cordis; los roles de interfaz, implementación y consumidor se clasifican en `scripts/gen-doc-graphs.ts` con una guarda de completitud.
