from pydantic import BaseModel, Field


class AgentHeartbeatMessage(BaseModel):
    type: str = Field(pattern="^agent\.heartbeat$")


class AgentMetricsData(BaseModel):
    cpu_percent: float = Field(ge=0, le=100)
    ram_percent: float = Field(ge=0, le=100)
    disk_percent: float = Field(ge=0, le=100)
    uptime_seconds: float = Field(ge=0)
    net_bytes_recv: float | None = Field(default=None, ge=0)
    net_bytes_sent: float | None = Field(default=None, ge=0)
    cpu_per_core: list[float] | None = None
    load_avg_1: float | None = Field(default=None, ge=0)
    load_avg_5: float | None = Field(default=None, ge=0)
    load_avg_15: float | None = Field(default=None, ge=0)
    temps: list[dict[str, float | str]] | None = None
    disk_mounts: list[dict[str, float | str]] | None = None


class AgentMetricsMessage(BaseModel):
    type: str = Field(pattern="^agent\.metrics\.push$")
    data: AgentMetricsData


class AgentActionResultData(BaseModel):
    request_id: str
    status: str = Field(pattern="^(succeeded|failed|timeout)$")
    exit_code: int | None = None
    output_text: str | None = None
    error_text: str | None = None


class AgentActionResultMessage(BaseModel):
    type: str = Field(pattern="^agent\.action\.result$")
    data: AgentActionResultData


class ClientTerminalStartData(BaseModel):
    device_id: int
    shell: str | None = None


class ClientTerminalStartMessage(BaseModel):
    type: str = Field(pattern=r"^client\.terminal\.start$")
    data: ClientTerminalStartData


class ClientTerminalInputData(BaseModel):
    session_id: str
    input: str


class ClientTerminalInputMessage(BaseModel):
    type: str = Field(pattern=r"^client\.terminal\.input$")
    data: ClientTerminalInputData


class ClientTerminalStopData(BaseModel):
    session_id: str


class ClientTerminalStopMessage(BaseModel):
    type: str = Field(pattern=r"^client\.terminal\.stop$")
    data: ClientTerminalStopData


class AgentTerminalOutputData(BaseModel):
    session_id: str
    stream: str = Field(pattern=r"^(stdout|stderr)$")
    chunk: str


class AgentTerminalOutputMessage(BaseModel):
    type: str = Field(pattern=r"^agent\.terminal\.output$")
    data: AgentTerminalOutputData


class AgentTerminalExitData(BaseModel):
    session_id: str
    exit_code: int | None = None


class AgentTerminalExitMessage(BaseModel):
    type: str = Field(pattern=r"^agent\.terminal\.exit$")
    data: AgentTerminalExitData


class ClientAiStartData(BaseModel):
    device_id: int
    provider: str = Field(pattern=r"^(claude|opencode)$")
    mode: str = Field(pattern=r"^(oneshot|pty)$")


class ClientAiStartMessage(BaseModel):
    type: str = Field(pattern=r"^client\.ai\.start$")
    data: ClientAiStartData


class ClientAiMessageData(BaseModel):
    session_id: str
    text: str = Field(min_length=1, max_length=8000)


class ClientAiMessage(BaseModel):
    type: str = Field(pattern=r"^client\.ai\.message$")
    data: ClientAiMessageData


class ClientAiStopData(BaseModel):
    session_id: str


class ClientAiStopMessage(BaseModel):
    type: str = Field(pattern=r"^client\.ai\.stop$")
    data: ClientAiStopData


class AgentAiDeltaData(BaseModel):
    session_id: str
    chunk: str
    seq: int | None = None


class AgentAiDeltaMessage(BaseModel):
    type: str = Field(pattern=r"^agent\.ai\.delta$")
    data: AgentAiDeltaData


class AgentAiDoneData(BaseModel):
    session_id: str
    exit_code: int | None = None


class AgentAiDoneMessage(BaseModel):
    type: str = Field(pattern=r"^agent\.ai\.done$")
    data: AgentAiDoneData


class AgentAiErrorData(BaseModel):
    session_id: str
    detail: str


class AgentAiErrorMessage(BaseModel):
    type: str = Field(pattern=r"^agent\.ai\.error$")
    data: AgentAiErrorData


class AgentAiPtyReadyData(BaseModel):
    session_id: str


class AgentAiPtyReadyMessage(BaseModel):
    type: str = Field(pattern=r"^agent\.ai\.pty\.ready$")
    data: AgentAiPtyReadyData
