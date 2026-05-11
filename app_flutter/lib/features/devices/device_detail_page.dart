import 'dart:async';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design_tokens.dart';
import '../../core/providers.dart';
import '../../core/ws_client.dart';
import '../../shared/app_snackbar.dart';
import '../../shared/ui_components.dart';
import '../actions/action_models.dart';
import '../actions/action_service.dart';
import 'device_metric_model.dart';
import 'device_models.dart';
import 'device_service.dart';
import 'terminal_history_store.dart';
import 'terminal_suggestion_service.dart';

class DeviceDetailPage extends ConsumerStatefulWidget {
  const DeviceDetailPage({
    super.key,
    required this.device,
    required this.wsBaseUrl,
    this.embedded = false,
  });

  final Device device;
  final String wsBaseUrl;
  final bool embedded;

  @override
  ConsumerState<DeviceDetailPage> createState() => _DeviceDetailPageState();
}

class _DeviceDetailPageState extends ConsumerState<DeviceDetailPage> with TickerProviderStateMixin {
  late final DeviceService _deviceService;
  late final ActionService _actionService;
  late final TabController _tabController;
  final WsClient _wsClient = WsClient();
  StreamSubscription<Map<String, dynamic>>? _wsSub;

  late Future<List<DeviceMetric>> _metricsFuture;
  late Future<List<DeviceAction>> _actionsFuture;
  late Future<List<ActionRun>> _historyFuture;
  final List<ActionRun> _optimisticRuns = [];
  final List<DeviceAction> _actionsCache = [];
  HistoryFilter _historyFilter = HistoryFilter.all;

  final TextEditingController _terminalInputCtrl = TextEditingController();
  final FocusNode _terminalInputFocus = FocusNode();
  final StringBuffer _terminalBuffer = StringBuffer();
  final ScrollController _terminalScrollCtrl = ScrollController();
  final TerminalHistoryStore _terminalHistoryStore = TerminalHistoryStore();
  final TerminalSuggestionService _terminalSuggestionService = TerminalSuggestionService();
  String? _terminalSessionId;
  bool _terminalStarting = false;
  bool _terminalActive = false;
  String? _aiSessionId;
  bool _aiStarting = false;
  bool _aiStreaming = false;
  String _aiProvider = 'claude';
  String _aiMode = 'oneshot';
  bool _aiDroppingSystemBlock = false;
  final TextEditingController _aiInputCtrl = TextEditingController();
  final List<_AiMessage> _aiMessages = <_AiMessage>[];
  List<String> _terminalHistory = <String>[];
  Map<String, int> _terminalUsage = <String, int>{};
  List<TerminalSuggestion> _terminalSuggestions = <TerminalSuggestion>[];
  int _terminalHistoryCursor = -1;
  String _recentTerminalOutput = '';
  String _recentTerminalError = '';

  static const int _tabCount = 7;
  _DesktopConsoleView _desktopConsoleView = _DesktopConsoleView.system;
  bool _consoleFullscreen = false;
  int _mobileBottomIndex = 0;
  _MobileTopTab _mobileTopTab = _MobileTopTab.resumen;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabCount, vsync: this);
    _deviceService = ref.read(deviceServiceProvider);
    _actionService = ref.read(actionServiceProvider);
    _reloadAll();
    unawaited(_loadTerminalHistory());
    final token = ref.read(sessionStoreProvider).accessToken;
    if (token != null && token.isNotEmpty) {
      _wsSub = _wsClient
          .connect(wsBaseUrl: widget.wsBaseUrl, token: token)
          .listen(
            _onWsEvent,
            onError: (error) {
              if (!mounted) return;
              setState(() {
                _terminalStarting = false;
                _terminalActive = false;
                _terminalSessionId = null;
              });
              AppSnackbar.error(context, 'WebSocket desconectado: $error');
            },
          );
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _wsSub?.cancel();
    _wsClient.disconnect();
    _terminalInputCtrl.dispose();
    _terminalInputFocus.dispose();
    _aiInputCtrl.dispose();
    _terminalScrollCtrl.dispose();
    super.dispose();
  }

  void _onWsEvent(Map<String, dynamic> event) {
    if (!mounted) return;
    final type = event['type'] as String?;
    if (type == 'server.terminal.started') {
      final data = event['data'];
      final sessionId = data is Map<String, dynamic> ? data['session_id'] as String? : null;
      if (sessionId != null && sessionId.isNotEmpty) {
        setState(() { _terminalSessionId = sessionId; _terminalStarting = false; _terminalActive = true; });
        _appendTerminal('[session started: $sessionId]\n');
      }
      return;
    }
    if (type == 'client.terminal.output') {
      final data = event['data'];
      if (data is Map<String, dynamic>) {
        final sessionId = data['session_id'] as String?;
        if (sessionId != null && sessionId == _terminalSessionId) {
          final stream = data['stream'] as String?;
          final chunk = data['chunk'] as String? ?? '';
          if (chunk.isNotEmpty) {
            if (stream == 'stderr') {
              _recentTerminalError = (_recentTerminalError + chunk);
              if (_recentTerminalError.length > 4000) _recentTerminalError = _recentTerminalError.substring(_recentTerminalError.length - 4000);
            } else {
              _recentTerminalOutput = (_recentTerminalOutput + chunk);
              if (_recentTerminalOutput.length > 4000) _recentTerminalOutput = _recentTerminalOutput.substring(_recentTerminalOutput.length - 4000);
            }
            _appendTerminal(chunk);
          }
        }
      }
      return;
    }
    if (type == 'client.terminal.exit') {
      final data = event['data'];
      if (data is Map<String, dynamic>) {
        final sessionId = data['session_id'] as String?;
        if (sessionId != null && sessionId == _terminalSessionId) {
          final exitCode = data['exit_code'];
          _appendTerminal('\n[session ended: exit_code=$exitCode]\n');
          setState(() { _terminalSessionId = null; _terminalActive = false; _terminalStarting = false; });
        }
      }
      return;
    }
    if (type == 'server.error') {
      final detail = event['detail']?.toString() ?? 'Error de servidor';
      _appendTerminal('\n[server.error] $detail\n');
      if (_terminalStarting) setState(() { _terminalStarting = false; });
      return;
    }
    if (type == 'server.ai.started') {
      final data = event['data'];
      final sessionId = data is Map<String, dynamic> ? data['session_id'] as String? : null;
      if (sessionId != null && sessionId.isNotEmpty) setState(() { _aiSessionId = sessionId; _aiStarting = false; });
      return;
    }
    if (type == 'server.ai.pty.ready') return;
    if (type == 'server.ai.delta') {
      final data = event['data'];
      if (data is Map<String, dynamic>) {
        final sessionId = data['session_id'] as String?;
        if (sessionId != null && sessionId == _aiSessionId) {
          final chunk = _sanitizeAiChunk(data['chunk'] as String? ?? '');
          if (chunk.isNotEmpty) {
            setState(() {
              if (_aiMessages.isEmpty || _aiMessages.last.role != 'assistant' || !_aiMessages.last.streaming) {
                _aiMessages.add(_AiMessage(role: 'assistant', text: chunk, streaming: true));
              } else {
                _aiMessages[_aiMessages.length - 1] = _AiMessage(role: 'assistant', text: _aiMessages.last.text + chunk, streaming: true);
              }
            });
          }
        }
      }
      return;
    }
    if (type == 'server.ai.done') {
      final data = event['data'];
      final sessionId = data is Map<String, dynamic> ? data['session_id'] as String? : null;
      if (sessionId != null && sessionId == _aiSessionId) {
        setState(() {
          _aiStreaming = false;
          if (_aiMessages.isNotEmpty && _aiMessages.last.role == 'assistant' && _aiMessages.last.streaming) {
            _aiMessages[_aiMessages.length - 1] = _AiMessage(role: 'assistant', text: _aiMessages.last.text, streaming: false);
          }
        });
      }
      return;
    }
    if (type == 'server.ai.error') {
      final data = event['data'];
      final detail = data is Map<String, dynamic> ? (data['detail']?.toString() ?? 'AI error') : 'AI error';
      if (_aiSessionId != null) setState(() { _aiStreaming = false; _aiMessages.add(_AiMessage(role: 'system', text: '[error] $detail', streaming: false)); });
      return;
    }

    final deviceId = event['device_id'];
    if (deviceId != widget.device.id) return;
    if (type == 'client.device.metric.updated') setState(() { _metricsFuture = _loadMetrics(); });
    if (type == 'client.action.run.updated') {
      final runData = event['run'];
      if (runData is Map<String, dynamic>) {
        final updated = ActionRun.fromJson(runData);
        final index = _optimisticRuns.indexWhere((r) => r.requestId == updated.requestId);
        if (index >= 0) {
          if (updated.status == 'succeeded' || updated.status == 'failed' || updated.status == 'timeout') {
            _optimisticRuns.removeAt(index);
          } else {
            _optimisticRuns[index] = updated;
          }
        }
      }
      setState(() { _historyFuture = _loadHistory(); });
    }
  }

  void _appendTerminal(String text) {
    _terminalBuffer.write(text);
    if (_terminalBuffer.length > 120000) {
      final tail = _terminalBuffer.toString();
      _terminalBuffer..clear()..write(tail.substring(tail.length - 90000));
    }
    if (mounted) {
      _recomputeTerminalSuggestions();
      setState(() {});
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_terminalScrollCtrl.hasClients) return;
        _terminalScrollCtrl.jumpTo(_terminalScrollCtrl.position.maxScrollExtent);
      });
    }
  }

  void _startTerminal() {
    if (_terminalStarting || _terminalActive) return;
    _terminalBuffer.clear();
    _recentTerminalOutput = '';
    _recentTerminalError = '';
    _terminalHistoryCursor = -1;
    _recomputeTerminalSuggestions();
    setState(() { _terminalStarting = true; });
    _wsClient.send({'type': 'client.terminal.start', 'data': {'device_id': widget.device.id, 'shell': 'default'}});
  }

  void _stopTerminal() {
    final sessionId = _terminalSessionId;
    if (sessionId == null) return;
    _wsClient.send({'type': 'client.terminal.stop', 'data': {'session_id': sessionId}});
    setState(() { _terminalSessionId = null; _terminalActive = false; _terminalStarting = false; });
  }

  void _sendTerminalInput() {
    final sessionId = _terminalSessionId;
    if (sessionId == null) return;
    final line = _terminalInputCtrl.text;
    if (line.trim().isEmpty) return;
    unawaited(_terminalHistoryStore.append(widget.device.id, line));
    unawaited(_terminalHistoryStore.bumpUsage(widget.device.id, line));
    _terminalHistory = [..._terminalHistory, line.trim()];
    final key = line.trim();
    _terminalUsage = {..._terminalUsage, key: (_terminalUsage[key] ?? 0) + 1};
    _terminalHistoryCursor = -1;
    _wsClient.send({'type': 'client.terminal.input', 'data': {'session_id': sessionId, 'input': '$line\n'}});
    _appendTerminal('> $line\n');
    _terminalInputCtrl.clear();
    _recomputeTerminalSuggestions();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      FocusScope.of(context).requestFocus(_terminalInputFocus);
    });
  }

  Future<void> _loadTerminalHistory() async {
    final loaded = await _terminalHistoryStore.load(widget.device.id);
    final usage = await _terminalHistoryStore.loadUsage(widget.device.id);
    if (!mounted) return;
    setState(() { _terminalHistory = loaded; _terminalUsage = usage; _terminalHistoryCursor = -1; });
    _recomputeTerminalSuggestions();
  }

  Future<void> _clearTerminalHistory() async {
    await _terminalHistoryStore.clear(widget.device.id);
    if (!mounted) return;
    setState(() { _terminalHistory = <String>[]; _terminalUsage = <String, int>{}; _terminalHistoryCursor = -1; });
    _recomputeTerminalSuggestions();
    if (mounted) AppSnackbar.success(context, 'Historial de terminal limpiado');
  }

  void _recomputeTerminalSuggestions() {
    _terminalSuggestions = _terminalSuggestionService.suggestions(
      hostType: widget.device.hostType,
      input: _terminalInputCtrl.text,
      history: _terminalHistory,
      usageByCommand: _terminalUsage,
      recentOutput: _recentTerminalOutput,
      recentError: _recentTerminalError,
    );
  }

  void _applySuggestion(TerminalSuggestion suggestion) {
    _terminalInputCtrl.text = suggestion.command;
    _terminalInputCtrl.selection = TextSelection.collapsed(offset: _terminalInputCtrl.text.length);
    _recomputeTerminalSuggestions();
    if (mounted) WidgetsBinding.instance.addPostFrameCallback((_) { if (!mounted) return; FocusScope.of(context).requestFocus(_terminalInputFocus); });
    setState(() {});
  }

  KeyEventResult _handleTerminalKeyEvent(FocusNode node, KeyEvent event) {
    if (!_terminalActive) return KeyEventResult.ignored;
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
      if (_terminalHistory.isEmpty) return KeyEventResult.handled;
      final next = _terminalHistoryCursor < 0 ? _terminalHistory.length - 1 : (_terminalHistoryCursor - 1).clamp(0, _terminalHistory.length - 1);
      _terminalHistoryCursor = next;
      _terminalInputCtrl.text = _terminalHistory[_terminalHistoryCursor];
      _terminalInputCtrl.selection = TextSelection.collapsed(offset: _terminalInputCtrl.text.length);
      _recomputeTerminalSuggestions();
      setState(() {});
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
      if (_terminalHistory.isEmpty) return KeyEventResult.handled;
      if (_terminalHistoryCursor <= 0) { _terminalHistoryCursor = -1; _terminalInputCtrl.clear(); }
      else { _terminalHistoryCursor = (_terminalHistoryCursor + 1).clamp(0, _terminalHistory.length - 1); _terminalInputCtrl.text = _terminalHistory[_terminalHistoryCursor]; }
      _terminalInputCtrl.selection = TextSelection.collapsed(offset: _terminalInputCtrl.text.length);
      _recomputeTerminalSuggestions();
      setState(() {});
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.tab) {
      if (_terminalSuggestions.isNotEmpty) _applySuggestion(_terminalSuggestions.first);
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  void _startAiSession() {
    if (_aiStarting || _aiSessionId != null) return;
    setState(() { _aiStarting = true; });
    _wsClient.send({'type': 'client.ai.start', 'data': {'device_id': widget.device.id, 'provider': _aiProvider, 'mode': _aiMode}});
  }

  void _stopAiSession() {
    final sessionId = _aiSessionId;
    if (sessionId == null) return;
    _wsClient.send({'type': 'client.ai.stop', 'data': {'session_id': sessionId}});
    setState(() { _aiSessionId = null; _aiStarting = false; _aiStreaming = false; });
  }

  void _sendAiPrompt() {
    final sessionId = _aiSessionId;
    if (sessionId == null || _aiStreaming) return;
    final text = _aiInputCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() { _aiMessages.add(_AiMessage(role: 'user', text: text, streaming: false)); _aiStreaming = true; });
    _wsClient.send({'type': 'client.ai.message', 'data': {'session_id': sessionId, 'text': text}});
    _aiInputCtrl.clear();
  }

  void _clearActiveConsoleView() {
    setState(() {
      if (_desktopConsoleView == _DesktopConsoleView.system) {
        _terminalBuffer.clear();
      } else {
        _aiMessages.clear();
        _aiDroppingSystemBlock = false;
      }
    });
  }

  Future<void> _openExpandedConsole() async {
    setState(() {
      _consoleFullscreen = true;
    });
  }

  void _closeExpandedConsole() {
    setState(() {
      _consoleFullscreen = false;
    });
  }

  void _reloadAll() {
    _metricsFuture = _loadMetrics();
    _actionsFuture = _loadActions();
    _historyFuture = _loadHistory();
  }

  Future<List<DeviceMetric>> _loadMetrics() => _deviceService.fetchMetrics(deviceId: widget.device.id);

  Future<List<DeviceAction>> _loadActions() async {
    final actions = await _actionService.fetchActions(deviceId: widget.device.id);
    _actionsCache..clear()..addAll(actions);
    return actions;
  }

  Future<List<ActionRun>> _loadHistory() async {
    final history = await _actionService.fetchHistory(deviceId: widget.device.id);
    final requestIds = history.map((r) => r.requestId).toSet();
    if (_optimisticRuns.isNotEmpty) _optimisticRuns.removeWhere((r) => requestIds.contains(r.requestId));
    return history;
  }

  Future<ActionRun> _runAction(DeviceAction action, Map<String, dynamic> params) async {
    final run = await _actionService.runAction(deviceId: widget.device.id, actionId: action.id, params: params);
    if (!mounted) return run;
    AppSnackbar.success(context, 'Acción enviada: ${action.name}');
    setState(() { _historyFuture = _loadHistory(); });
    return run;
  }

  Future<void> _runActionOptimistic(DeviceAction action) async {
    final params = await _collectParamsForAction(action);
    if (params == null) return;
    final temp = ActionRun(id: -DateTime.now().millisecondsSinceEpoch, requestId: 'temp-${DateTime.now().microsecondsSinceEpoch}', status: 'running', createdAt: DateTime.now());
    setState(() => _optimisticRuns.insert(0, temp));
    try {
      final createdRun = await _runAction(action, params);
      if (!mounted) return;
      setState(() {
        final idx = _optimisticRuns.indexWhere((r) => r.id == temp.id);
        if (idx >= 0) _optimisticRuns[idx] = createdRun;
      });
      _startHistorySync();
    } catch (e) {
      if (!mounted) return;
      setState(() { _optimisticRuns.removeWhere((r) => r.id == temp.id); });
      AppSnackbar.error(context, e.toString());
    }
  }

  Future<void> _retryRun(ActionRun run) async {
    final actionId = run.actionId;
    if (actionId == null) { AppSnackbar.error(context, 'No se puede reintentar: action_id ausente'); return; }
    DeviceAction? action;
    for (final a in _actionsCache) { if (a.id == actionId) { action = a; break; } }
    if (action == null) { AppSnackbar.error(context, 'No se encontró la acción para reintentar'); return; }
    await _runActionOptimistic(action);
  }

  void _startHistorySync() { unawaited(_syncHistoryUntilSettled()); }

  Future<void> _syncHistoryUntilSettled() async {
    for (var i = 0; i < 10; i++) {
      if (!mounted) return;
      await Future<void>.delayed(const Duration(seconds: 2));
      if (!mounted) return;
      setState(() { _historyFuture = _loadHistory(); });
      await _historyFuture;
      final hasPending = _optimisticRuns.any((r) => r.status == 'running' || r.status == 'queued');
      if (!hasPending) return;
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (!widget.embedded) return _buildStandaloneLayout();
    return _buildEmbeddedLayout();
  }

  Widget _buildStandaloneLayout() {
    final legacySections = <Widget Function()>[
      _buildMetricsSection,
      _buildActionsSection,
      _buildTerminalSection,
      _buildHistorySection,
    ];
    assert(legacySections.length == 4);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: RefreshIndicator(
        onRefresh: () async { setState(_reloadAll); await Future.wait([_metricsFuture, _actionsFuture, _historyFuture]); },
        child: _buildMobileStandaloneContent(),
      ),
      bottomNavigationBar: _buildMobileBottomBar(),
    );
  }

  Widget _buildMobileStandaloneContent() {
    if (_mobileBottomIndex == 2) {
      return _buildMobileTerminalFullScreen();
    }
    if (_mobileBottomIndex == 3) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 20),
        children: [
          _buildMobileSimpleHeader('Alertas', rightIcon: Icons.filter_alt_outlined),
          const SizedBox(height: 12),
          _buildMobileAlertFilterRow(),
          const SizedBox(height: 10),
          _buildMobileAlertasSection(),
        ],
      );
    }
    if (_mobileBottomIndex == 4) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 20),
        children: [
          _buildMobileSimpleHeader('Mas'),
          const SizedBox(height: 12),
          _buildMobileMoreSection(),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 20),
      children: [
        _buildMobileSummaryHeader(),
        const SizedBox(height: 12),
        _buildMobileSummaryTabs(),
        const SizedBox(height: 10),
        _buildMobileTopTabContent(),
      ],
    );
  }

  Widget _buildMobileSimpleHeader(String title, {IconData rightIcon = Icons.more_vert}) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final titleColor = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final secondary = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    final muted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    return SafeArea(
      bottom: false,
      child: Row(
        children: [
          Icon(Icons.menu_rounded, color: secondary),
          const SizedBox(width: 12),
          Text(title, style: TextStyle(color: titleColor, fontSize: 32, fontWeight: FontWeight.w700, letterSpacing: -0.35)),
          const Spacer(),
          Icon(rightIcon, color: muted, size: 21),
        ],
      ),
    );
  }

  Widget _buildMobileAlertFilterRow() {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final chipBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final chipBorder = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final chipText = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;

    Widget chip(String label, int count, Color color, bool active) {
      return AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
          gradient: active ? AppGradients.buttonPrimary : null,
          color: active ? null : chipBg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? Colors.transparent : chipBorder),
          boxShadow: active
              ? <BoxShadow>[
                  BoxShadow(
                    color: const Color(0xFF2F63FF).withValues(alpha: 0.22),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            Text(label, style: TextStyle(color: active ? Colors.white : chipText, fontSize: 12.5, fontWeight: FontWeight.w600)),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(color: color.withValues(alpha: active ? 0.25 : 0.18), borderRadius: BorderRadius.circular(999)),
              child: Text('$count', style: TextStyle(color: active ? Colors.white : color, fontSize: 10.5, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          chip('Todas', 6, const Color(0xFF4168FF), true),
          const SizedBox(width: 8),
          chip('Criticas', 1, AppColors.accentRed, false),
          const SizedBox(width: 8),
          chip('Advertencias', 2, AppColors.accentAmber, false),
          const SizedBox(width: 8),
          chip('Info', 3, const Color(0xFF3291FF), false),
        ],
      ),
    );
  }

  Widget _buildMobileMoreSection() {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final titleColor = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final secondary = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    final muted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;

    Widget sectionTitle(String text) => Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
      child: Text(text, style: TextStyle(color: secondary, fontSize: 16, fontWeight: FontWeight.w600)),
    );

    Widget row(IconData icon, String label, {String? trailing, Color? danger, VoidCallback? onTap}) {
      final rowBorder = danger == null ? border : danger.withValues(alpha: 0.4);
      final rowText = danger ?? secondary;
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: rowBorder),
            ),
            child: Row(
              children: [
                Icon(icon, size: 18, color: rowText),
                const SizedBox(width: 10),
                Expanded(child: Text(label, style: TextStyle(color: rowText, fontSize: 15, fontWeight: FontWeight.w600))),
                if (trailing != null) Text(trailing, style: TextStyle(color: muted, fontSize: 13)),
                const SizedBox(width: 4),
                Icon(Icons.chevron_right_rounded, color: rowText == secondary ? muted : rowText, size: 18),
              ],
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
          ),
          child: Row(
            children: [
              const CircleAvatar(radius: 20, backgroundColor: Color(0xFF4A5BFF), child: Text('AD', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Administrador', style: TextStyle(color: titleColor, fontSize: 17, fontWeight: FontWeight.w700)),
                  Text('admin@controlcenter.io', style: TextStyle(color: muted, fontSize: 12.5)),
                ]),
              ),
              Icon(Icons.chevron_right_rounded, color: muted),
            ],
          ),
        ),
        const SizedBox(height: 14),
        sectionTitle('Herramientas'),
        row(Icons.bolt_rounded, 'Ejecutar comando rapido', onTap: () => setState(() => _mobileBottomIndex = 2)),
        row(Icons.device_hub_outlined, 'Conexiones', onTap: () => context.go('/')),
        row(Icons.schedule_rounded, 'Tareas programadas', onTap: () => setState(() => _mobileTopTab = _MobileTopTab.procesos)),
        row(Icons.description_outlined, 'Reportes', onTap: () => setState(() => _mobileTopTab = _MobileTopTab.metricas)),
        const SizedBox(height: 8),
        sectionTitle('Configuracion'),
        row(Icons.settings_outlined, 'Preferencias', onTap: () => context.push('/settings')),
        row(Icons.notifications_none_rounded, 'Notificaciones', onTap: () => setState(() => _mobileBottomIndex = 3)),
        row(
          Icons.dark_mode_outlined,
          'Tema',
          trailing: _themeModeLabel(ref.watch(themeModeProvider)),
          onTap: _openThemePicker,
        ),
        row(Icons.logout_rounded, 'Cerrar sesion', danger: AppColors.accentRed, onTap: () async {
          await ref.read(authControllerProvider.notifier).logout();
          if (!mounted) return;
          context.go('/login');
        }),
      ],
    );
  }

  Widget _buildMobileTopTabContent() {
    switch (_mobileTopTab) {
      case _MobileTopTab.metricas:
        return _buildMobileMetricasSection();
      case _MobileTopTab.procesos:
        return _buildMobileProcesosSection();
      case _MobileTopTab.alertas:
        return _buildMobileAlertasSection();
      case _MobileTopTab.resumen:
        return _buildMobileResumenSection();
    }
  }

  Widget _buildMobileTerminalFullScreen() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 6, 14, 6),
          child: _buildMobileTerminalHeader(),
        ),
        Expanded(
          child: _buildConsolePane(fullscreen: true, dedicatedMobile: true),
        ),
      ],
    );
  }

  Widget _buildMobileTerminalHeader() {
    return SafeArea(
      bottom: false,
      child: Row(
        children: [
          const Icon(Icons.menu_rounded, color: AppColors.textSecondary, size: 21),
          const SizedBox(width: 10),
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: AppColors.surfaceRaised,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: const Icon(Icons.dns_rounded, color: AppColors.textSecondary, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.device.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.2)),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: widget.device.isOnline ? AppColors.accentGreen : AppColors.accentRed,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(widget.device.isOnline ? 'En linea' : 'Desconectado', style: TextStyle(color: widget.device.isOnline ? AppColors.accentGreen : AppColors.accentRed, fontSize: 11.5, fontWeight: FontWeight.w600)),
                  ],
                ),
              ],
            ),
          ),
          const Icon(Icons.more_vert, color: AppColors.textMuted, size: 20),
        ],
      ),
    );
  }

  Widget _buildMobileBottomBar() {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final navBg = isLight ? AppColors.lightSurface : const Color(0xFF060D1A);
    final navBorder = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    Widget item({required int index, required IconData icon, required String label}) {
      final selected = _mobileBottomIndex == index;
      final color = selected ? const Color(0xFF6B85FF) : (isLight ? AppColors.lightTextSecondary : AppColors.textMuted);
      return Expanded(
        child: GestureDetector(
          onTap: () {
            if (index == 1) {
              context.go('/');
              return;
            }
            setState(() {
              _mobileBottomIndex = index;
            });
          },
          child: Container(
            color: Colors.transparent,
            padding: const EdgeInsets.symmetric(vertical: 7),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(height: 4),
                Text(label, style: TextStyle(fontSize: 10.2, color: color, fontWeight: selected ? FontWeight.w600 : FontWeight.w500)),
                const SizedBox(height: 2),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  width: 20,
                  height: 2,
                  decoration: BoxDecoration(
                    color: selected ? const Color(0xFF6B85FF) : Colors.transparent,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: navBg,
          border: Border(top: BorderSide(color: navBorder)),
        ),
        child: Row(
          children: [
            item(index: 0, icon: Icons.grid_view_rounded, label: 'Resumen'),
            item(index: 1, icon: Icons.devices_outlined, label: 'Dispositivos'),
            item(index: 2, icon: Icons.terminal_rounded, label: 'Terminal'),
            item(index: 3, icon: Icons.notifications_none_rounded, label: 'Alertas'),
            item(index: 4, icon: Icons.more_horiz_rounded, label: 'Mas'),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileSummaryHeader() {
    return SafeArea(
      bottom: false,
      child: SizedBox(
        height: 92,
        child: Stack(
        children: [
          Positioned(
            left: 0,
            top: 8,
            child: IconButton(
              onPressed: () => context.pop(),
              icon: const Icon(Icons.menu_rounded, color: AppColors.textSecondary, size: 22),
              visualDensity: VisualDensity.compact,
            ),
          ),
          Positioned(
            right: 0,
            top: 8,
            child: const Padding(
              padding: EdgeInsets.only(right: 10),
              child: Icon(Icons.more_vert, color: AppColors.textMuted, size: 22),
            ),
          ),
          Positioned.fill(
            child: Align(
              alignment: Alignment.topCenter,
              child: Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceRaised,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: const Icon(Icons.dns_rounded, color: AppColors.textSecondary, size: 29),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.device.name,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 7,
                              height: 7,
                              decoration: BoxDecoration(
                                color: widget.device.isOnline ? AppColors.accentGreen : AppColors.accentRed,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              widget.device.isOnline ? 'En linea' : 'Desconectado',
                              style: TextStyle(
                                color: widget.device.isOnline ? AppColors.accentGreen : AppColors.accentRed,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildMobileSummaryTabs() {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final activeColor = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final muted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    Widget tab(String text, _MobileTopTab value) {
      final active = _mobileTopTab == value;
      return Padding(
        padding: const EdgeInsets.only(right: 20),
        child: GestureDetector(
          onTap: () => setState(() => _mobileTopTab = value),
          child: Column(
            children: [
              Text(text, style: TextStyle(color: active ? activeColor : muted, fontSize: 17, fontWeight: active ? FontWeight.w600 : FontWeight.w500)),
              const SizedBox(height: 7),
              Container(
                width: text.length * 7.5,
                height: 2,
                decoration: BoxDecoration(
                  color: active ? AppColors.accentBlue : Colors.transparent,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          tab('Resumen', _MobileTopTab.resumen),
          tab('Metricas', _MobileTopTab.metricas),
          tab('Procesos', _MobileTopTab.procesos),
          tab('Alertas', _MobileTopTab.alertas),
        ],
      ),
    );
  }

  Widget _buildMobileMetricasSection() {
    return FutureBuilder<List<DeviceMetric>>(
      future: _metricsFuture,
      builder: (context, snapshot) {
        final metrics = snapshot.data ?? <DeviceMetric>[];
        if (snapshot.connectionState == ConnectionState.waiting && metrics.isEmpty) {
          return const Padding(
            padding: EdgeInsets.only(top: 50),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentCyan)),
          );
        }
        if (metrics.isEmpty) {
          return const EmptyState(icon: Icons.bar_chart_rounded, title: 'Sin métricas aún');
        }
        final m = metrics.first;
        return Column(
          children: [
            _MobileMetricCard(
              label: 'CPU',
              valueText: '${m.cpuPercent.toStringAsFixed(0)}%',
              subtitle: 'Promedio: ${_averageMetric(metrics, (x) => x.cpuPercent).toStringAsFixed(0)}%',
              chip: '2.56 GHz',
              color: const Color(0xFF2B86FF),
              metrics: metrics,
              selector: (x) => x.cpuPercent,
            ),
            const SizedBox(height: 10),
            _MobileMetricCard(
              label: 'RAM',
              valueText: '${m.ramPercent.toStringAsFixed(0)}%',
              subtitle: 'Promedio: ${_averageMetric(metrics, (x) => x.ramPercent).toStringAsFixed(0)}%',
              chip: '8 GB DDR4',
              color: AppColors.accentGreen,
              metrics: metrics,
              selector: (x) => x.ramPercent,
            ),
            const SizedBox(height: 10),
            _MobileMetricCard(
              label: 'Disco',
              valueText: '${m.diskPercent.toStringAsFixed(0)}%',
              subtitle: 'Promedio: ${_averageMetric(metrics, (x) => x.diskPercent).toStringAsFixed(0)}%',
              chip: 'NVMe SSD',
              color: const Color(0xFFA760FF),
              metrics: metrics,
              selector: (x) => x.diskPercent,
            ),
          ],
        );
      },
    );
  }

  Widget _buildMobileProcesosSection() {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final textSecondary = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    final textMuted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;

    const rows = <(String, String, String)>[
      ('systemd', '1.2%', '120.4 MB'),
      ('nginx', '0.8%', '98.7 MB'),
      ('postgres', '0.6%', '256.2 MB'),
      ('python3', '0.3%', '45.1 MB'),
      ('sshd', '0.2%', '12.8 MB'),
      ('docker', '0.2%', '88.3 MB'),
      ('node', '0.1%', '35.6 MB'),
    ];

    return Column(
      children: [
        Row(
          children: const [
            Expanded(child: _MobileStatTiny(value: '128', label: 'Procesos')),
            SizedBox(width: 8),
            Expanded(child: _MobileStatTiny(value: '3.2%', label: 'CPU total')),
            SizedBox(width: 8),
            Expanded(child: _MobileStatTiny(value: '1.4 GB', label: 'RAM total')),
          ],
        ),
        const SizedBox(height: 10),
        _buildMobileProcessSearchField(),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
          ),
          child: Column(
            children: [
              Padding(
                padding: EdgeInsets.fromLTRB(12, 10, 12, 8),
                child: Row(
                  children: [
                    Expanded(child: Text('Proceso', style: TextStyle(color: textMuted, fontSize: 12))),
                    SizedBox(width: 60, child: Text('CPU', style: TextStyle(color: textMuted, fontSize: 12))),
                    SizedBox(width: 70, child: Text('RAM', style: TextStyle(color: textMuted, fontSize: 12))),
                  ],
                ),
              ),
              ...rows.asMap().entries.expand((entry) {
                final i = entry.key;
                final r = entry.value;
                return <Widget>[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                    child: Row(
                      children: [
                        Expanded(child: Text(r.$1, style: TextStyle(color: textSecondary, fontSize: 14.5))),
                        SizedBox(width: 60, child: Text(r.$2, style: TextStyle(color: textSecondary, fontSize: 14))),
                        SizedBox(width: 70, child: Text(r.$3, style: TextStyle(color: textSecondary, fontSize: 14))),
                      ],
                    ),
                  ),
                  if (i != rows.length - 1)
                    Divider(height: 1, thickness: 1, color: (isLight ? AppColors.lightBorder : const Color(0x1C2A3F62))),
                ];
              }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMobileProcessSearchField() {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final hint = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    final text = isLight ? AppColors.lightTextPrimary : AppColors.textSecondary;
    return Container(
      height: 38,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: TextField(
        style: TextStyle(color: text, fontSize: 13.5),
        decoration: InputDecoration(
          hintText: 'Buscar proceso...',
          hintStyle: TextStyle(color: hint, fontSize: 13.5),
          prefixIcon: Icon(Icons.search_rounded, size: 17, color: hint),
          suffixIcon: Icon(Icons.tune_rounded, size: 16, color: hint),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildMobileAlertasSection() {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final titleColor = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final muted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;

    const alerts = <(String, String, String, Color, IconData)>[
      ('Alta carga de CPU', 'Critica', 'Hace 2m', AppColors.accentRed, Icons.emergency_rounded),
      ('Uso de disco elevado', 'Advertencia', 'Hace 15m', AppColors.accentAmber, Icons.warning_amber_rounded),
      ('Memoria cercana al limite', 'Advertencia', 'Hace 30m', AppColors.accentAmber, Icons.warning_amber_rounded),
      ('Backup completado', 'Informativa', 'Hace 1h', Color(0xFF3291FF), Icons.info_outline_rounded),
    ];
    return Column(
      children: alerts
          .map((a) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: a.$4.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    Icon(a.$5, color: a.$4, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(a.$1, style: TextStyle(color: titleColor, fontSize: 15, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 3),
                          Text(a.$2, style: TextStyle(color: a.$4, fontSize: 12.5, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 2),
                          Text('Servidor-01', style: TextStyle(color: muted, fontSize: 12)),
                        ],
                      ),
                    ),
                    Text(a.$3, style: TextStyle(color: muted, fontSize: 12)),
                  ],
                ),
              ))
          .toList(),
    );
  }

  double _averageMetric(List<DeviceMetric> list, double Function(DeviceMetric) pick) {
    if (list.isEmpty) return 0;
    var sum = 0.0;
    for (final item in list) {
      sum += pick(item);
    }
    return sum / list.length;
  }

  String _themeModeLabel(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.system:
        return 'Sistema';
      case ThemeMode.dark:
        return 'Oscuro';
      case ThemeMode.light:
        return 'Claro';
    }
  }

  Future<void> _openThemePicker() async {
    final current = ref.read(themeModeProvider);
    final selected = await showDialog<ThemeMode>(
      context: context,
      builder: (ctx) {
        Widget option(ThemeMode mode, String label) {
          final active = current == mode;
          return ListTile(
            title: Text(label),
            trailing: active
                ? const Icon(Icons.check_rounded, color: AppColors.accentCyan)
                : null,
            onTap: () {
              Navigator.of(ctx).pop(mode);
            },
          );
        }

        return AlertDialog(
          title: const Text('Tema'),
          contentPadding: const EdgeInsets.fromLTRB(6, 10, 6, 8),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              option(ThemeMode.system, 'Sistema'),
              option(ThemeMode.dark, 'Oscuro'),
              option(ThemeMode.light, 'Claro'),
            ],
          ),
        );
      },
    );

    if (selected != null) {
      ref.read(themeModeProvider.notifier).setMode(selected);
    }
  }

  Widget _buildMobileResumenSection() {
    return FutureBuilder<List<DeviceMetric>>(
      future: _metricsFuture,
      builder: (context, snapshot) {
        final latest = snapshot.data?.isNotEmpty == true ? snapshot.data!.first : null;
        final uptime = latest != null ? _formatUptimeLong(latest.uptimeSeconds) : '—';
        final cpu = latest != null ? '${latest.cpuPercent.toStringAsFixed(0)}% (${latest.cpuPercent.toStringAsFixed(1)} GHz)' : '—';
        final ram = latest != null ? '${latest.ramPercent.toStringAsFixed(0)}% (${latest.ramPercent.toStringAsFixed(1)} / 8 GB)' : '—';
        final disk = latest != null ? '${latest.diskPercent.toStringAsFixed(0)}% (201 / 480 GB)' : '—';
        return Column(
          children: [
            _MobileInfoCard(
              title: 'Informacion general',
              rows: [
                _MobileInfoRow(label: 'SO', value: widget.device.osName ?? 'Ubuntu 22.04 LTS'),
                const _MobileInfoRow(label: 'IP', value: '192.168.1.10'),
                _MobileInfoRow(label: 'Tiempo activo', value: uptime),
                const _MobileInfoRow(label: 'Arquitectura', value: 'x86_64'),
                const _MobileInfoRow(label: 'Kernel', value: '5.15.0-101-generic'),
              ],
            ),
            const SizedBox(height: 10),
            _MobileInfoCard(
              title: 'Recursos',
              rows: [
                _MobileInfoRow(label: 'CPU', value: cpu, icon: Icons.memory_rounded),
                _MobileInfoRow(label: 'RAM', value: ram, icon: Icons.developer_board_rounded),
                _MobileInfoRow(label: 'Disco', value: disk, icon: Icons.storage_rounded),
              ],
            ),
            const SizedBox(height: 10),
            _MobileInfoCard(
              title: 'Red',
              rows: const [
                _MobileInfoRow(label: 'Descarga', value: '218 Mbps', icon: Icons.south_rounded, trailingArrow: true),
                _MobileInfoRow(label: 'Carga', value: '42 Mbps', icon: Icons.north_rounded, trailingArrow: true),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: DecoratedBox(
                decoration: BoxDecoration(gradient: AppGradients.buttonPrimary, borderRadius: BorderRadius.circular(12)),
                child: TextButton(
                  onPressed: () {},
                  child: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 9),
                    child: Text('Ver metricas completas', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18)),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildEmbeddedLayout() {
    return Stack(
      children: [
        Column(
          children: [
            _buildDeviceHeader(),
            Container(
              color: AppColors.deepBg,
              child: Row(
                children: [
                  Expanded(
                    child: TabBar(
                      controller: _tabController,
                      isScrollable: true,
                      tabAlignment: TabAlignment.start,
                      dividerColor: AppColors.borderSubtle,
                      indicatorColor: AppColors.accentBlue,
                      indicatorWeight: 2,
                      labelColor: AppColors.textPrimary,
                      unselectedLabelColor: AppColors.textMuted,
                      labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                      tabs: const [
                        Tab(text: 'Resumen'),
                        Tab(text: 'Métricas'),
                        Tab(text: 'Procesos'),
                        Tab(text: 'Servicios'),
                        Tab(text: 'Registros'),
                        Tab(text: 'Alertas'),
                        Tab(text: 'Configuración'),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceBase,
                            borderRadius: BorderRadius.circular(7),
                            border: Border.all(color: AppColors.borderSubtle),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.schedule_rounded, size: 13, color: AppColors.textMuted),
                              SizedBox(width: 5),
                              Text('Últimos 5 min', style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary)),
                              SizedBox(width: 4),
                              Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: AppColors.textMuted),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Row(
                          children: [
                            Container(
                              width: 6, height: 6,
                              decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.accentGreen),
                            ),
                            const SizedBox(width: 5),
                            const Text('Actualizando...', style: TextStyle(fontSize: 11.5, color: AppColors.accentGreen)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildResumenTab(),
                  _buildMetricasTab(),
                  _buildPlaceholderTab('Procesos', Icons.list_alt_rounded),
                  _buildServiciosTab(),
                  _buildRegistrosTab(),
                  _buildPlaceholderTab('Alertas', Icons.notifications_outlined),
                  _buildConfiguracionTab(),
                ],
              ),
            ),
          ],
        ),
        Positioned.fill(
          child: IgnorePointer(
            ignoring: !_consoleFullscreen,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 170),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) {
                final fade = CurvedAnimation(
                  parent: animation,
                  curve: Curves.easeOutCubic,
                );
                return FadeTransition(
                  opacity: fade,
                  child: ScaleTransition(
                    scale: Tween<double>(begin: 0.985, end: 1).animate(fade),
                    child: child,
                  ),
                );
              },
              child: _consoleFullscreen
                  ? GestureDetector(
                      key: const ValueKey('console-overlay-on'),
                      onTap: _closeExpandedConsole,
                      child: Container(
                        color: Colors.black.withValues(alpha: 0.72),
                        child: SafeArea(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: GestureDetector(
                              onTap: () {},
                              child: _buildConsolePane(fullscreen: true),
                            ),
                          ),
                        ),
                      ),
                    )
                  : const SizedBox(key: ValueKey('console-overlay-off')),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDeviceHeader() {
    final isOnline = widget.device.isOnline;
    final statusColor = isOnline ? AppColors.accentGreen : AppColors.accentRed;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: const BoxDecoration(
        color: AppColors.deepBg,
        border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
      ),
      child: Row(
        children: [
          // Device icon
          Container(
            width: 46, height: 46,
            decoration: BoxDecoration(
              color: AppColors.surfaceRaised,
              borderRadius: BorderRadius.circular(11),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: const Icon(Icons.dns_rounded, color: AppColors.textSecondary, size: 24),
          ),
          const SizedBox(width: 14),
          // Name + status + subtitle
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(widget.device.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6, height: 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: statusColor,
                            boxShadow: isOnline ? [BoxShadow(color: statusColor.withValues(alpha: 0.6), blurRadius: 4)] : null,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          isOnline ? 'En línea' : 'Desconectado',
                          style: TextStyle(fontSize: 11.5, color: statusColor, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              FutureBuilder<List<DeviceMetric>>(
                future: _metricsFuture,
                builder: (context, snap) {
                  final uptime = snap.data?.isNotEmpty == true ? _formatUptimeLong(snap.data!.first.uptimeSeconds) : null;
                  final parts = <String>[];
                  if (widget.device.osName != null) parts.add(widget.device.osName!);
                  parts.add(widget.device.hostType);
                  if (uptime != null) parts.add('Tiempo activo: $uptime');
                  return Text(
                    parts.join(' • '),
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  );
                },
              ),
            ],
          ),
          const Spacer(),
          // Reiniciar button
          OutlinedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.refresh_rounded, size: 14),
            label: const Text('Reiniciar'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.textSecondary,
              side: const BorderSide(color: AppColors.borderSubtle),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
              textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(width: 8),
          // Detener button (red)
          OutlinedButton.icon(
            onPressed: _stopTerminal,
            icon: const Icon(Icons.stop_rounded, size: 14),
            label: const Text('Detener'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.accentRed,
              side: BorderSide(color: AppColors.accentRed.withValues(alpha: 0.45)),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
              textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(width: 8),
          // Más acciones split button
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Ink(
                  decoration: const BoxDecoration(gradient: AppGradients.buttonPrimary),
                  child: InkWell(
                    onTap: () => _tabController.animateTo(6),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      child: Text('Más acciones', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Colors.white)),
                    ),
                  ),
                ),
                Container(width: 1, height: 36, color: const Color(0xFF3730A3)),
                Ink(
                  decoration: const BoxDecoration(gradient: AppGradients.buttonPrimary),
                  child: InkWell(
                    onTap: () {},
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 9),
                      child: Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Resumen tab ────────────────────────────────────────────────────────────

  Widget _buildResumenTab() {
    return Container(
      color: AppColors.deepBg,
      child: Column(
        children: [
          // Metric cards
          FutureBuilder<List<DeviceMetric>>(
            future: _metricsFuture,
            builder: (context, snap) {
              final metrics = snap.data ?? [];
              final latest = metrics.isNotEmpty ? metrics.first : null;
              final isLoading = snap.connectionState == ConnectionState.waiting && metrics.isEmpty;
              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: isLoading
                          ? const _MetricCardSkeleton()
                          : _MetricAreaCard(
                              label: 'CPU',
                              icon: Icons.memory_rounded,
                              value: latest?.cpuPercent ?? 0,
                              subtitle: widget.device.osName ?? widget.device.hostType,
                              color: AppColors.metricCpu,
                              metrics: metrics,
                              selector: (m) => m.cpuPercent,
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: isLoading
                          ? const _MetricCardSkeleton()
                          : _MetricAreaCard(
                              label: 'RAM',
                              icon: Icons.developer_board_rounded,
                              value: latest?.ramPercent ?? 0,
                              subtitle: 'Memoria del sistema',
                              color: AppColors.metricRam,
                              metrics: metrics,
                              selector: (m) => m.ramPercent,
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: isLoading
                          ? const _MetricCardSkeleton()
                          : _MetricAreaCard(
                              label: 'Disco',
                              icon: Icons.storage_rounded,
                              value: latest?.diskPercent ?? 0,
                              subtitle: 'Almacenamiento usado',
                              color: AppColors.metricDisk,
                              metrics: metrics,
                              selector: (m) => m.diskPercent,
                            ),
                    ),
                  ],
                ),
              );
            },
          ),
          // System info row
          FutureBuilder<List<DeviceMetric>>(
            future: _metricsFuture,
            builder: (context, snap) {
              final latest = snap.data?.isNotEmpty == true ? snap.data!.first : null;
              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceBase,
                    borderRadius: AppRadii.md,
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: Row(
                    children: [
                      _SysInfoItem(icon: Icons.computer_rounded, label: 'Sistema', value: widget.device.osName ?? '—'),
                      _SysInfoDivider(),
                      _SysInfoItem(icon: Icons.timer_outlined, label: 'Tiempo activo', value: latest != null ? _formatUptimeLong(latest.uptimeSeconds) : '—'),
                      _SysInfoDivider(),
                      _SysInfoItem(icon: Icons.people_outline, label: 'Usuarios', value: '—'),
                      _SysInfoDivider(),
                      _SysInfoItem(icon: Icons.speed_outlined, label: 'Carga promedio', value: latest != null ? '${latest.cpuPercent.toStringAsFixed(1)}%' : '—'),
                      _SysInfoDivider(),
                      _SysInfoItem(icon: Icons.wifi_outlined, label: 'Red', value: '—'),
                      _SysInfoDivider(),
                      _SysInfoItem(
                        icon: Icons.circle,
                        label: 'Estado',
                        value: widget.device.isOnline ? 'En línea' : 'Offline',
                        valueColor: widget.device.isOnline ? AppColors.accentGreen : AppColors.accentRed,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          // Console pane
          Expanded(
            child: _consoleFullscreen
                ? const SizedBox.shrink()
                : _buildConsolePane(),
          ),
        ],
      ),
    );
  }

  // ── Métricas tab ───────────────────────────────────────────────────────────

  Widget _buildMetricasTab() {
    return Container(
      color: AppColors.deepBg,
      child: FutureBuilder<List<DeviceMetric>>(
        future: _metricsFuture,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting && snap.data == null) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentCyan, strokeWidth: 2));
          }
          final metrics = snap.data ?? [];
          if (metrics.isEmpty) {
            return const EmptyState(icon: Icons.bar_chart_rounded, title: 'Sin métricas aún', subtitle: 'Las métricas aparecerán cuando el agente envíe datos.');
          }
          final m = metrics.first;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: _MetricTile(label: 'CPU', value: '${m.cpuPercent.toStringAsFixed(1)}%', color: AppColors.accentGreen)),
                    const SizedBox(width: 12),
                    Expanded(child: _MetricTile(label: 'RAM', value: '${m.ramPercent.toStringAsFixed(1)}%', color: AppColors.accentCyan)),
                    const SizedBox(width: 12),
                    Expanded(child: _MetricTile(label: 'Disco', value: '${m.diskPercent.toStringAsFixed(1)}%', color: AppColors.accentAmber)),
                    const SizedBox(width: 12),
                    Expanded(child: _MetricTile(label: 'Uptime', value: _formatUptime(m.uptimeSeconds), color: AppColors.accentBlue)),
                  ],
                ),
                const SizedBox(height: 20),
                const Text('Tendencias', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                const Text('CPU · RAM · Disco', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(height: 16),
                Container(
                  height: 280,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceBase,
                    borderRadius: AppRadii.md,
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: _MetricTimelineChart(metrics: metrics),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Servicios tab ──────────────────────────────────────────────────────────

  Widget _buildServiciosTab() {
    return Container(
      color: AppColors.deepBg,
      child: FutureBuilder<List<DeviceAction>>(
        future: _actionsFuture,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentCyan, strokeWidth: 2));
          }
          final actions = snap.data ?? [];
          if (actions.isEmpty) {
            return const EmptyState(icon: Icons.apps_rounded, title: 'Sin acciones disponibles');
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Acciones disponibles', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: actions.map((a) => FilledButton.tonal(
                    onPressed: () => _runActionOptimistic(a),
                    child: Text(a.slug),
                  )).toList(),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Registros tab ──────────────────────────────────────────────────────────

  Widget _buildRegistrosTab() {
    return Container(
      color: AppColors.deepBg,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Historial de ejecuciones', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(label: const Text('Todos'), selected: _historyFilter == HistoryFilter.all, onSelected: (_) => setState(() => _historyFilter = HistoryFilter.all)),
                ChoiceChip(label: const Text('Exitosos'), selected: _historyFilter == HistoryFilter.succeeded, onSelected: (_) => setState(() => _historyFilter = HistoryFilter.succeeded)),
                ChoiceChip(label: const Text('Fallidos'), selected: _historyFilter == HistoryFilter.failed, onSelected: (_) => setState(() => _historyFilter = HistoryFilter.failed)),
                ChoiceChip(label: const Text('En curso'), selected: _historyFilter == HistoryFilter.running, onSelected: (_) => setState(() => _historyFilter = HistoryFilter.running)),
              ],
            ),
            const SizedBox(height: 12),
            FutureBuilder<List<ActionRun>>(
              future: _historyFuture,
              builder: (context, snap) {
                final serverHistory = snap.data ?? <ActionRun>[];
                final serverRequestIds = serverHistory.map((r) => r.requestId).toSet();
                final optimisticOnly = _optimisticRuns.where((r) => !serverRequestIds.contains(r.requestId));
                final historyAll = [...optimisticOnly, ...serverHistory];
                final history = historyAll.where((run) {
                  switch (_historyFilter) {
                    case HistoryFilter.succeeded: return run.status == 'succeeded';
                    case HistoryFilter.failed: return run.status == 'failed' || run.status == 'timeout';
                    case HistoryFilter.running: return run.status == 'running' || run.status == 'queued';
                    case HistoryFilter.all: return true;
                  }
                }).toList();
                if (snap.connectionState == ConnectionState.waiting && snap.data == null) {
                  return Column(children: List.generate(4, (_) => const Padding(padding: EdgeInsets.only(bottom: 8), child: SkeletonListTile())));
                }
                if (history.isEmpty) {
                  return const EmptyState(icon: Icons.history, title: 'Sin ejecuciones aún');
                }
                return Column(
                  children: history.take(20).map((run) => Card(
                    margin: const EdgeInsets.only(bottom: 6),
                    child: ListTile(
                      leading: _statusIcon(run.status),
                      title: Text('#${run.id} — ${run.status}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      subtitle: Text(
                        '${run.outputText ?? run.errorText ?? 'Sin salida'}\nexit_code: ${run.exitCode?.toString() ?? '-'}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: _statusColor(run.status).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                            child: Text(run.status, style: TextStyle(color: _statusColor(run.status), fontWeight: FontWeight.w700, fontSize: 11)),
                          ),
                          if (run.status == 'failed' || run.status == 'timeout')
                            IconButton(tooltip: 'Reintentar', onPressed: () => _retryRun(run), icon: const Icon(Icons.refresh, size: 16), visualDensity: VisualDensity.compact),
                        ],
                      ),
                      onTap: () => _showRunDetails(run),
                    ),
                  )).toList(),
                );
              },
            ),
            const SizedBox(height: 20),
            const Text('AI Chat', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            _buildAiSection(),
          ],
        ),
      ),
    );
  }

  // ── Configuración tab ──────────────────────────────────────────────────────

  Widget _buildConfiguracionTab() {
    return Container(
      color: AppColors.deepBg,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoCard(),
          ],
        ),
      ),
    );
  }


  // ── Placeholder tab ────────────────────────────────────────────────────────

  Widget _buildPlaceholderTab(String label, IconData icon) {
    return Container(
      color: AppColors.deepBg,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 60, height: 60,
              decoration: BoxDecoration(color: AppColors.surfaceRaised, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.borderSubtle)),
              child: Icon(icon, size: 28, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            Text('$label próximamente', style: const TextStyle(color: AppColors.textSecondary, fontSize: 15, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            const Text('Esta sección estará disponible en próximas versiones.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  // ── Console pane ───────────────────────────────────────────────────────────

  Widget _buildConsolePane({bool fullscreen = false, bool dedicatedMobile = false}) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final panelBg = isLight ? AppColors.lightSurface : const Color(0xFF060D1A);
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final titleColor = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    final muted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;

    return Padding(
      padding: fullscreen
          ? EdgeInsets.zero
          : const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Container(
        decoration: BoxDecoration(
          color: panelBg,
          borderRadius: dedicatedMobile ? BorderRadius.circular(0) : AppRadii.md,
          border: Border.all(color: border),
        ),
        child: Column(
          children: [
            // Console header
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: dedicatedMobile ? 10 : 14,
                vertical: dedicatedMobile ? 7 : 9,
              ),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: border)),
              ),
              child: Row(
                children: [
                  Icon(
                    _desktopConsoleView == _DesktopConsoleView.system
                        ? Icons.terminal_rounded
                        : Icons.smart_toy_outlined,
                    size: dedicatedMobile ? 13 : 14,
                    color: muted,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _desktopConsoleView == _DesktopConsoleView.system
                        ? 'Consola'
                        : 'AI Console',
                    style: TextStyle(
                      fontSize: dedicatedMobile ? 12.5 : 13,
                      color: titleColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 6, height: 6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _desktopConsoleView == _DesktopConsoleView.system
                          ? (_terminalActive
                              ? AppColors.accentGreen
                              : (_terminalStarting
                                  ? AppColors.accentAmber
                                  : muted))
                          : (_aiStreaming
                              ? AppColors.accentGreen
                              : (_aiStarting
                                  ? AppColors.accentAmber
                                  : muted)),
                    ),
                  ),
                  if (_desktopConsoleView == _DesktopConsoleView.ai) ...[
                    const SizedBox(width: 10),
                    _InlineSelect(
                      value: _aiMode,
                      items: const <String>['oneshot', 'pty'],
                      onChanged: (_aiSessionId == null)
                          ? (v) => setState(() => _aiMode = v)
                          : null,
                    ),
                    const SizedBox(width: 6),
                    _InlineSelect(
                      value: _aiProvider,
                      items: const <String>['claude', 'opencode'],
                      onChanged: (_aiSessionId == null)
                          ? (v) => setState(() => _aiProvider = v)
                          : null,
                    ),
                  ],
                  const Spacer(),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _MiniIconBtn(
                    icon: Icons.delete_outline,
                    tooltip: 'Limpiar consola',
                    onTap: _clearActiveConsoleView,
                    compact: dedicatedMobile,
                      ),
                      const SizedBox(width: 8),
                  if (!dedicatedMobile)
                    _MiniIconBtn(
                      icon: fullscreen
                          ? Icons.fullscreen_exit_rounded
                          : Icons.open_in_full_rounded,
                      tooltip: fullscreen ? 'Salir de expandido' : 'Expandir consola',
                      onTap: () {
                        if (fullscreen) {
                          _closeExpandedConsole();
                          return;
                        }
                        unawaited(_openExpandedConsole());
                      },
                    ),
                  if (!dedicatedMobile)
                    const SizedBox(width: 8),
                  PopupMenuButton<_DesktopConsoleView>(
                        tooltip: 'Cambiar consola',
                        color: isLight ? AppColors.lightSurface : AppColors.surfaceBase,
                        onSelected: (value) {
                          setState(() {
                            _desktopConsoleView = value;
                          });
                        },
                        itemBuilder: (ctx) => const [
                          PopupMenuItem(
                            value: _DesktopConsoleView.system,
                            child: Text('System Terminal'),
                          ),
                          PopupMenuItem(
                            value: _DesktopConsoleView.ai,
                            child: Text('AI Console'),
                          ),
                        ],
                    child: Container(
                          width: dedicatedMobile ? 30 : 34,
                          height: dedicatedMobile ? 30 : 34,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceSoft,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.borderSubtle),
                          ),
                          child: Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: dedicatedMobile ? 17 : 18,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (_desktopConsoleView == _DesktopConsoleView.system)
              _buildSystemConsoleBody(dedicatedMobile: dedicatedMobile)
            else
              _buildAiConsoleBody(dedicatedMobile: dedicatedMobile),
          ],
        ),
      ),
    );
  }

  Widget _buildSystemConsoleBody({bool dedicatedMobile = false}) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final termText = isLight ? const Color(0xFF0F5132) : AppColors.accentGreen;
    final hintText = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    final inputText = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final divider = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final outputBg = isLight ? const Color(0xFFF5F8FD) : const Color(0xFF050C18);
    final outputBorder = isLight ? AppColors.lightBorder : const Color(0xFF10223E);
    final hasTerminalOutput = _terminalBuffer.toString().isNotEmpty;

    return Expanded(
      child: Column(
        children: [
          Expanded(
            child: Container(
              margin: EdgeInsets.fromLTRB(10, 10, 10, dedicatedMobile ? 8 : 10),
              padding: EdgeInsets.all(dedicatedMobile ? 10 : 12),
              decoration: BoxDecoration(
                color: hasTerminalOutput ? outputBg : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: hasTerminalOutput ? outputBorder : Colors.transparent,
                ),
              ),
              child: SingleChildScrollView(
                controller: _terminalScrollCtrl,
                child: SelectableText(
                  _terminalBuffer.toString().isEmpty
                      ? 'Sin salida aún. Haz clic en "Abrir" para iniciar la sesión.'
                      : _terminalBuffer.toString(),
                  style: TextStyle(
                    fontFamily: 'Consolas',
                    color: termText,
                    fontSize: dedicatedMobile ? 12 : 12.5,
                    height: dedicatedMobile ? 1.48 : 1.55,
                  ),
                ),
              ),
            ),
          ),
          if (_terminalSuggestions.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: divider)),
              ),
              child: Wrap(
                spacing: 6,
                runSpacing: 4,
                children: _terminalSuggestions
                    .map(
                      (s) => ActionChip(
                        label: Text(
                          s.label,
                          style: TextStyle(
                            fontSize: 11,
                            color: isLight
                                ? AppColors.lightTextPrimary
                                : AppColors.textSecondary,
                          ),
                        ),
                        backgroundColor: isLight
                            ? AppColors.lightSurface
                            : AppColors.surfaceSoft,
                        side: BorderSide(
                          color: isLight
                              ? AppColors.lightBorder
                              : AppColors.borderSubtle,
                        ),
                        onPressed: () => _applySuggestion(s),
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 0,
                        ),
                        tooltip: s.reason,
                      ),
                    )
                    .toList(),
              ),
            ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: divider)),
            ),
            child: Row(
              children: [
                _MiniBtn(
                  label: _terminalActive
                      ? 'Cerrar'
                      : (_terminalStarting ? 'Iniciando...' : 'Abrir'),
                  onTap: _terminalActive
                      ? _stopTerminal
                      : (_terminalStarting ? null : _startTerminal),
                  compact: dedicatedMobile,
                  emphasized: !_terminalActive,
                  loading: _terminalStarting,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Focus(
                    onKeyEvent: _handleTerminalKeyEvent,
                    child: TextField(
                      controller: _terminalInputCtrl,
                      focusNode: _terminalInputFocus,
                      enabled: _terminalActive,
                      textInputAction: TextInputAction.send,
                      minLines: 1,
                      maxLines: 1,
                      cursorColor: termText,
                      style: TextStyle(
                        fontFamily: 'Consolas',
                        fontSize: 13,
                        color: inputText,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Escribe un comando... (ej: dir)',
                        hintStyle: TextStyle(
                          color: hintText,
                          fontSize: 13,
                          fontFamily: 'Consolas',
                        ),
                        isDense: true,
                        filled: true,
                        fillColor: isLight
                            ? AppColors.lightSurface
                            : AppColors.surfaceSoft,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 10,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: divider),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: termText, width: 1.15),
                        ),
                        disabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: divider),
                        ),
                        prefixIcon: Padding(
                          padding: const EdgeInsets.only(left: 10, right: 8),
                          child: Text(
                            '\$',
                            style: TextStyle(
                              color: termText,
                              fontFamily: 'Consolas',
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        prefixIconConstraints: const BoxConstraints(
                          minWidth: 0,
                          minHeight: 0,
                        ),
                        suffixIcon: (_terminalActive &&
                                _terminalInputCtrl.text.trim().isNotEmpty)
                            ? IconButton(
                                tooltip: 'Limpiar comando',
                                onPressed: () {
                                  _terminalInputCtrl.clear();
                                  _recomputeTerminalSuggestions();
                                  setState(() {});
                                },
                                icon: Icon(
                                  Icons.close_rounded,
                                  size: 16,
                                  color: isLight
                                      ? AppColors.lightTextSecondary
                                      : AppColors.textMuted,
                                ),
                              )
                            : null,
                      ),
                      onChanged: (_) {
                        _terminalHistoryCursor = -1;
                        _recomputeTerminalSuggestions();
                        setState(() {});
                      },
                      onSubmitted: (_) => _sendTerminalInput(),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                dedicatedMobile
                    ? _SquareSendBtn(
                        enabled: _terminalActive,
                        onTap: _sendTerminalInput,
                        icon: Icons.play_arrow_rounded,
                      )
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(7),
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: _terminalActive ? AppGradients.buttonPrimary : null,
                            color: _terminalActive ? null : AppColors.surfaceSoft,
                          ),
                          child: InkWell(
                            onTap: _terminalActive ? _sendTerminalInput : null,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 8,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.play_arrow_rounded,
                                    size: 15,
                                    color: _terminalActive
                                        ? Colors.white
                                        : AppColors.textMuted,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    'Ejecutar',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: _terminalActive
                                          ? Colors.white
                                          : AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAiConsoleBody({bool dedicatedMobile = false}) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final divider = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final hintText = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    final outputBg = isLight ? const Color(0xFFF5F8FD) : const Color(0xFF050C18);
    final outputBorder = isLight ? AppColors.lightBorder : const Color(0xFF10223E);

    return Expanded(
      child: Column(
        children: [
          Expanded(
            child: Container(
              margin: EdgeInsets.fromLTRB(10, 10, 10, dedicatedMobile ? 8 : 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: outputBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: outputBorder),
              ),
              child: ListView.builder(
                itemCount: _aiMessages.length +
                    ((_aiStreaming &&
                            !(_aiMessages.isNotEmpty &&
                                _aiMessages.last.role == 'assistant' &&
                                _aiMessages.last.streaming))
                        ? 1
                        : 0),
                itemBuilder: (context, index) {
                  if (index >= _aiMessages.length) {
                    return const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: _AiTypingIndicator(),
                    );
                  }
                  final m = _aiMessages[index];
                  final color = m.role == 'user'
                      ? const Color(0xFF2B7FFF)
                      : (m.role == 'assistant'
                          ? const Color(0xFF1C9E67)
                          : const Color(0xFFD9822B));
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: SelectableText(
                      '[${m.role}] ${m.text}',
                      style: TextStyle(
                        color: color,
                        fontFamily: 'Consolas',
                        fontSize: 12,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: divider)),
            ),
            child: Row(
              children: [
                _MiniBtn(
                  label: _aiSessionId == null
                      ? (_aiStarting ? 'Iniciando...' : 'Iniciar AI')
                      : 'Cerrar AI',
                  onTap: _aiSessionId == null
                      ? (_aiStarting ? null : _startAiSession)
                      : _stopAiSession,
                  compact: dedicatedMobile,
                  emphasized: _aiSessionId == null,
                  loading: _aiStarting,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _aiInputCtrl,
                    enabled: _aiSessionId != null && !_aiStreaming,
                    decoration: InputDecoration(
                      border: InputBorder.none,
                      hintText: 'Escribe tu prompt para AI...',
                      hintStyle: TextStyle(color: hintText),
                      isDense: true,
                    ),
                    onSubmitted: (_) => _sendAiPrompt(),
                  ),
                ),
                const SizedBox(width: 10),
                dedicatedMobile
                    ? _SquareSendBtn(
                        enabled: _aiSessionId != null && !_aiStreaming,
                        onTap: _sendAiPrompt,
                        icon: Icons.send_rounded,
                      )
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(7),
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: (_aiSessionId != null && !_aiStreaming)
                                ? AppGradients.buttonPrimary
                                : null,
                            color: (_aiSessionId != null && !_aiStreaming)
                                ? null
                                : AppColors.surfaceSoft,
                          ),
                          child: InkWell(
                            onTap: (_aiSessionId != null && !_aiStreaming)
                                ? _sendAiPrompt
                                : null,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 8,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.send_rounded,
                                    size: 14,
                                    color: (_aiSessionId != null && !_aiStreaming)
                                        ? Colors.white
                                        : AppColors.textMuted,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    _aiStreaming ? 'Streaming...' : 'Enviar',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: (_aiSessionId != null && !_aiStreaming)
                                          ? Colors.white
                                          : AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Legacy section builders (used in standalone + embedded tabs) ──────────

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceBase,
        borderRadius: AppRadii.md,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: (widget.device.isOnline ? AppColors.accentGreen : AppColors.accentRed).withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(widget.device.isOnline ? Icons.cloud_done : Icons.cloud_off, color: widget.device.isOnline ? AppColors.accentGreen : AppColors.accentRed, size: 28),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.device.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            Text('${widget.device.hostType} — ${widget.device.osName ?? 'unknown'}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            if (widget.device.agentVersion != null) ...[
              const SizedBox(height: 2),
              Text('Agent v${widget.device.agentVersion}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ],
            const SizedBox(height: 6),
            StatusChip(
              label: widget.device.isOnline ? 'En línea' : 'Desconectado',
              color: widget.device.isOnline ? AppColors.accentGreen : AppColors.accentRed,
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _buildMetricsSection() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Métricas recientes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      const SizedBox(height: 8),
      FutureBuilder<List<DeviceMetric>>(
        future: _metricsFuture,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const SkeletonCard();
          final metrics = snap.data ?? [];
          if (metrics.isEmpty) return const Card(child: Padding(padding: EdgeInsets.all(24), child: EmptyState(icon: Icons.bar_chart, title: 'Sin métricas aún')));
          final m = metrics.first;
          return Card(
            child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
              Row(children: [
                _MetricTile(label: 'CPU', value: '${m.cpuPercent.toStringAsFixed(1)}%', color: AppColors.accentGreen),
                _MetricTile(label: 'RAM', value: '${m.ramPercent.toStringAsFixed(1)}%', color: AppColors.accentCyan),
                _MetricTile(label: 'Disco', value: '${m.diskPercent.toStringAsFixed(1)}%', color: AppColors.accentAmber),
                _MetricTile(label: 'UP', value: _formatUptime(m.uptimeSeconds), color: AppColors.accentBlue),
              ]),
              const SizedBox(height: 12),
              SizedBox(height: 180, child: _MetricTimelineChart(metrics: metrics)),
            ])),
          );
        },
      ),
    ]);
  }

  Widget _buildActionsSection() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Ejecutar acciones', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      const SizedBox(height: 8),
      FutureBuilder<List<DeviceAction>>(
        future: _actionsFuture,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return Wrap(spacing: 8, runSpacing: 8, children: List.generate(3, (_) => Container(width: 100, height: 36, decoration: BoxDecoration(color: AppColors.surfaceSoft, borderRadius: BorderRadius.circular(8)))));
          }
          final actions = snap.data ?? [];
          if (actions.isEmpty) return const Card(child: Padding(padding: EdgeInsets.all(16), child: EmptyState(icon: Icons.play_arrow, title: 'Sin acciones disponibles')));
          return Wrap(spacing: 8, runSpacing: 8, children: actions.map((a) => FilledButton.tonal(onPressed: () => _runActionOptimistic(a), child: Text(a.slug))).toList());
        },
      ),
    ]);
  }

  Widget _buildTerminalSection() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Consola remota', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      const SizedBox(height: 8),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          StatusChip(label: _terminalActive ? 'Activa' : (_terminalStarting ? 'Iniciando' : 'Inactiva'), color: _terminalActive ? AppColors.accentGreen : (_terminalStarting ? AppColors.accentAmber : Colors.grey)),
          const SizedBox(width: 8),
          if (!_terminalActive)
            FilledButton.tonalIcon(onPressed: _terminalStarting ? null : _startTerminal, icon: const Icon(Icons.terminal), label: const Text('Abrir consola'))
          else
            FilledButton.tonalIcon(onPressed: _stopTerminal, icon: const Icon(Icons.stop_circle_outlined), label: const Text('Cerrar')),
          const SizedBox(width: 8),
          IconButton(tooltip: 'Limpiar historial', onPressed: _clearTerminalHistory, icon: const Icon(Icons.delete_sweep_outlined)),
        ]),
        const SizedBox(height: 10),
        Container(
          width: double.infinity, height: 220, padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(10)),
          child: SingleChildScrollView(controller: _terminalScrollCtrl, child: SelectableText(
            _terminalBuffer.toString().isEmpty ? 'Sin salida aún.' : _terminalBuffer.toString(),
            style: const TextStyle(fontFamily: 'Consolas', color: AppColors.accentGreen, fontSize: 12, height: 1.35),
          )),
        ),
        const SizedBox(height: 8),
        if (_terminalSuggestions.isNotEmpty)
          Align(alignment: Alignment.centerLeft, child: Wrap(spacing: 6, runSpacing: 6, children: _terminalSuggestions.map((s) => ActionChip(
            label: Text(s.label),
            avatar: Text(_suggestionSourceLabel(s.source), style: const TextStyle(fontSize: 9)),
            onPressed: () => _applySuggestion(s),
            tooltip: s.reason,
          )).toList())),
        if (_terminalSuggestions.isNotEmpty) const SizedBox(height: 8),
        Row(children: [
          Expanded(child: Focus(onKeyEvent: _handleTerminalKeyEvent, child: TextField(
            controller: _terminalInputCtrl, focusNode: _terminalInputFocus, enabled: _terminalActive, autofocus: _terminalActive,
            textInputAction: TextInputAction.send,
            decoration: InputDecoration(
              labelText: 'Comando',
              hintText: 'Ej: dir / npm run dev / systemctl status',
              prefixText: '\$ ',
              suffixIcon: (_terminalActive && _terminalInputCtrl.text.trim().isNotEmpty)
                  ? IconButton(
                      tooltip: 'Limpiar comando',
                      onPressed: () { _terminalInputCtrl.clear(); _recomputeTerminalSuggestions(); setState(() {}); },
                      icon: const Icon(Icons.close_rounded, size: 18),
                    )
                  : null,
            ),
            onChanged: (_) { _terminalHistoryCursor = -1; _recomputeTerminalSuggestions(); setState(() {}); },
            onSubmitted: (_) => _sendTerminalInput(),
          ))),
          const SizedBox(width: 8),
          FilledButton(onPressed: _terminalActive ? _sendTerminalInput : null, child: const Text('Enviar')),
        ]),
      ]))),
    ]);
  }

  Widget _buildAiSection() {
    return Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(children: [
      Row(children: [
        DropdownButton<String>(
          value: _aiProvider,
          items: const [DropdownMenuItem(value: 'claude', child: Text('claude')), DropdownMenuItem(value: 'opencode', child: Text('opencode'))],
          onChanged: (_aiSessionId == null) ? (v) { if (v == null) return; setState(() => _aiProvider = v); } : null,
        ),
        const SizedBox(width: 8),
        DropdownButton<String>(
          value: _aiMode,
          items: const [DropdownMenuItem(value: 'oneshot', child: Text('one-shot')), DropdownMenuItem(value: 'pty', child: Text('pty'))],
          onChanged: (_aiSessionId == null) ? (v) { if (v == null) return; setState(() => _aiMode = v); } : null,
        ),
        const SizedBox(width: 8),
        if (_aiSessionId == null)
          FilledButton.tonal(onPressed: _aiStarting ? null : _startAiSession, child: const Text('Iniciar AI'))
        else
          FilledButton.tonal(onPressed: _stopAiSession, child: const Text('Cerrar AI')),
      ]),
      const SizedBox(height: 10),
      Container(
        width: double.infinity, height: 220, padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(10)),
        child: ListView.builder(
          itemCount: _aiMessages.length + ((_aiStreaming && !(_aiMessages.isNotEmpty && _aiMessages.last.role == 'assistant' && _aiMessages.last.streaming)) ? 1 : 0),
          itemBuilder: (context, index) {
            if (index >= _aiMessages.length) return const Padding(padding: EdgeInsets.only(bottom: 6), child: _AiTypingIndicator());
            final m = _aiMessages[index];
            final color = m.role == 'user' ? Colors.lightBlueAccent : (m.role == 'assistant' ? Colors.greenAccent : Colors.orangeAccent);
            return Padding(padding: const EdgeInsets.only(bottom: 6), child: SelectableText('[${m.role}] ${m.text}', style: TextStyle(color: color, fontFamily: 'Consolas', fontSize: 12)));
          },
        ),
      ),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: TextField(controller: _aiInputCtrl, enabled: _aiSessionId != null && !_aiStreaming, decoration: const InputDecoration(labelText: 'Prompt', hintText: 'Escribe tu mensaje para la AI'), onSubmitted: (_) => _sendAiPrompt())),
        const SizedBox(width: 8),
        FilledButton(onPressed: (_aiSessionId != null && !_aiStreaming) ? _sendAiPrompt : null, child: Text(_aiStreaming ? 'Streaming...' : 'Enviar')),
      ]),
    ])));
  }

  Widget _buildHistorySection() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Historial', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        ChoiceChip(label: const Text('Todos'), selected: _historyFilter == HistoryFilter.all, onSelected: (_) => setState(() => _historyFilter = HistoryFilter.all)),
        ChoiceChip(label: const Text('Exitosos'), selected: _historyFilter == HistoryFilter.succeeded, onSelected: (_) => setState(() => _historyFilter = HistoryFilter.succeeded)),
        ChoiceChip(label: const Text('Fallidos'), selected: _historyFilter == HistoryFilter.failed, onSelected: (_) => setState(() => _historyFilter = HistoryFilter.failed)),
        ChoiceChip(label: const Text('En curso'), selected: _historyFilter == HistoryFilter.running, onSelected: (_) => setState(() => _historyFilter = HistoryFilter.running)),
      ]),
      const SizedBox(height: 8),
      FutureBuilder<List<ActionRun>>(
        future: _historyFuture,
        builder: (context, snap) {
          final serverHistory = snap.data ?? <ActionRun>[];
          final serverRequestIds = serverHistory.map((r) => r.requestId).toSet();
          final optimisticOnly = _optimisticRuns.where((r) => !serverRequestIds.contains(r.requestId));
          final historyAll = [...optimisticOnly, ...serverHistory];
          final history = historyAll.where((run) {
            switch (_historyFilter) {
              case HistoryFilter.succeeded: return run.status == 'succeeded';
              case HistoryFilter.failed: return run.status == 'failed' || run.status == 'timeout';
              case HistoryFilter.running: return run.status == 'running' || run.status == 'queued';
              case HistoryFilter.all: return true;
            }
          }).toList();
          if (snap.connectionState == ConnectionState.waiting && snap.data == null) {
            return Column(children: List.generate(4, (_) => const Padding(padding: EdgeInsets.only(bottom: 8), child: SkeletonListTile())));
          }
          if (history.isEmpty) return const Card(child: Padding(padding: EdgeInsets.all(16), child: EmptyState(icon: Icons.history, title: 'Sin ejecuciones aún')));
          return Column(children: history.take(8).map((run) => Card(
            child: ListTile(
              leading: _statusIcon(run.status),
              title: Text('#${run.id} - ${run.status}', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${run.outputText ?? run.errorText ?? 'Sin salida'}\nexit_code: ${run.exitCode?.toString() ?? '-'}', maxLines: 3, overflow: TextOverflow.ellipsis),
              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: _statusColor(run.status).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                  child: Text(run.status, style: TextStyle(color: _statusColor(run.status), fontWeight: FontWeight.w700, fontSize: 11)),
                ),
                if (run.status == 'failed' || run.status == 'timeout')
                  IconButton(tooltip: 'Reintentar', onPressed: () => _retryRun(run), icon: const Icon(Icons.refresh), visualDensity: VisualDensity.compact),
              ]),
              onTap: () => _showRunDetails(run),
            ),
          )).toList());
        },
      ),
    ]);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  Color _statusColor(String status) {
    switch (status) {
      case 'succeeded': return AppColors.accentGreen;
      case 'failed': case 'timeout': return AppColors.accentRed;
      case 'running': case 'queued': return AppColors.accentAmber;
      default: return AppColors.textMuted;
    }
  }

  Widget _statusIcon(String status) {
    switch (status) {
      case 'completed': case 'succeeded': return const Icon(Icons.check_circle, color: AppColors.accentGreen);
      case 'failed': return const Icon(Icons.error, color: AppColors.accentRed);
      case 'running': return const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentAmber));
      default: return const Icon(Icons.circle_outlined, color: AppColors.textMuted);
    }
  }

  String _suggestionSourceLabel(TerminalSuggestionSource source) {
    switch (source) {
      case TerminalSuggestionSource.history: return 'hist';
      case TerminalSuggestionSource.heuristic: return 'ctx';
      case TerminalSuggestionSource.prefix: return 'base';
    }
  }

  String _sanitizeAiChunk(String input) {
    if (input.isEmpty) return input;
    var out = input;
    out = out.replaceAll(RegExp(r'Warning:\s*no stdin data received[^\n]*\n?', caseSensitive: false), '');
    final lower = out.toLowerCase();
    const startTag = '<system-reminder>';
    const endTag = '</system-reminder>';
    if (_aiDroppingSystemBlock) {
      final endIdx = lower.indexOf(endTag);
      if (endIdx >= 0) {
        _aiDroppingSystemBlock = false;
        out = out.substring(endIdx + endTag.length);
      } else {
        return '';
      }
    }
    while (true) {
      final l = out.toLowerCase();
      final s = l.indexOf(startTag);
      if (s < 0) break;
      final e = l.indexOf(endTag, s + startTag.length);
      if (e >= 0) { out = out.substring(0, s) + out.substring(e + endTag.length); }
      else { _aiDroppingSystemBlock = true; out = out.substring(0, s); break; }
    }
    return out;
  }

  Future<Map<String, dynamic>?> _collectParamsForAction(DeviceAction action) async {
    switch (action.slug) {
      case 'restart_service':
        final ctrl = TextEditingController(text: 'Spooler');
        final value = await showDialog<String>(context: context, builder: (ctx) => AlertDialog(
          title: const Text('Reiniciar servicio'),
          content: TextField(controller: ctrl, decoration: const InputDecoration(labelText: 'service_name'), autofocus: true),
          actions: [TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.of(ctx).pop(ctrl.text.trim()), child: const Text('Ejecutar'))],
        ));
        if (value == null) return null;
        if (value.isEmpty) { if (mounted) AppSnackbar.error(context, 'service_name es requerido'); return null; }
        return {'service_name': value};
      case 'run_backup':
        final srcCtrl = TextEditingController();
        final dstCtrl = TextEditingController();
        final confirmed = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
          title: const Text('Ejecutar backup'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: srcCtrl, decoration: const InputDecoration(labelText: 'source')),
            const SizedBox(height: 8),
            TextField(controller: dstCtrl, decoration: const InputDecoration(labelText: 'destination')),
          ]),
          actions: [TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Ejecutar'))],
        ));
        if (confirmed != true) return null;
        final src = srcCtrl.text.trim(), dst = dstCtrl.text.trim();
        if (src.isEmpty || dst.isEmpty) { if (mounted) AppSnackbar.error(context, 'source y destination son requeridos'); return null; }
        return {'source': src, 'destination': dst};
      default:
        return {};
    }
  }

  void _showRunDetails(ActionRun run) {
    final output = run.outputText?.trim();
    final error = run.errorText?.trim();
    showDialog<void>(context: context, builder: (ctx) => AlertDialog(
      title: Text('Run #${run.id} — ${run.status}'),
      content: SizedBox(width: 640, child: SingleChildScrollView(child: SelectableText(
        (output != null && output.isNotEmpty) ? output : (error != null && error.isNotEmpty) ? error : 'Sin salida',
      ))),
      actions: [TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cerrar'))],
    ));
  }

  String _formatUptime(double seconds) {
    final d = Duration(seconds: seconds.toInt());
    if (d.inDays > 0) return '${d.inDays}d';
    if (d.inHours > 0) return '${d.inHours}h';
    return '${d.inMinutes}m';
  }

  String _formatUptimeLong(double seconds) {
    final d = Duration(seconds: seconds.toInt());
    if (d.inDays > 0) return '${d.inDays}d ${d.inHours % 24}h ${d.inMinutes % 60}m';
    if (d.inHours > 0) return '${d.inHours}h ${d.inMinutes % 60}m';
    return '${d.inMinutes}m';
  }
}

// ── Enums ──────────────────────────────────────────────────────────────────

enum HistoryFilter { all, succeeded, failed, running }

enum _DesktopConsoleView { system, ai }

enum _MobileTopTab { resumen, metricas, procesos, alertas }

// ── Private data classes ──────────────────────────────────────────────────

class _AiMessage {
  _AiMessage({required this.role, required this.text, required this.streaming});
  final String role;
  final String text;
  final bool streaming;
}

// ── Small helper widgets ───────────────────────────────────────────────────


class _MiniBtn extends StatelessWidget {
  const _MiniBtn({
    required this.label,
    this.onTap,
    this.compact = false,
    this.emphasized = false,
    this.loading = false,
  });
  final String label;
  final VoidCallback? onTap;
  final bool compact;
  final bool emphasized;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final bg = isLight ? AppColors.lightRaised : AppColors.surfaceSoft;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final text = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    final disabled = isLight ? AppColors.lightTextSecondary.withValues(alpha: 0.75) : AppColors.textMuted;
    final showPrimary = emphasized && onTap != null && !loading;
    final showLoading = loading;
    final isDisabled = onTap == null;

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 140),
      opacity: isDisabled ? 0.72 : 1,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(compact ? 6 : 8),
        child: Ink(
          decoration: BoxDecoration(
            gradient: showPrimary ? AppGradients.buttonPrimary : null,
            color: showPrimary
                ? null
                : (showLoading
                    ? const Color(0xFFF8B84A).withValues(alpha: 0.16)
                    : bg),
            borderRadius: BorderRadius.circular(compact ? 6 : 8),
            border: Border.all(
              color: showPrimary
                  ? Colors.transparent
                  : (showLoading
                      ? const Color(0xFFF8B84A).withValues(alpha: 0.55)
                      : border),
            ),
            boxShadow: showPrimary
                ? <BoxShadow>[
                    BoxShadow(
                      color: const Color(0xFF2F63FF).withValues(alpha: 0.28),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : null,
          ),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(compact ? 6 : 8),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: compact ? 9 : 10, vertical: compact ? 4 : 6),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (showLoading) ...[
                    SizedBox(
                      width: compact ? 11 : 12,
                      height: compact ? 11 : 12,
                      child: const CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFF8B84A)),
                      ),
                    ),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: compact ? 10.5 : 11,
                      color: showPrimary
                          ? Colors.white
                          : (showLoading
                              ? const Color(0xFFB26E00)
                              : (onTap != null ? text : disabled)),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.1,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniIconBtn extends StatelessWidget {
  const _MiniIconBtn({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.compact = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final bg = isLight ? AppColors.lightRaised : AppColors.surfaceSoft;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final iconColor = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    final disabled = onTap == null;
    return Tooltip(
      message: tooltip,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 140),
        opacity: disabled ? 0.65 : 1,
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(compact ? 8 : 10),
          child: Ink(
            width: compact ? 32 : 36,
            height: compact ? 32 : 36,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(compact ? 8 : 10),
              border: Border.all(color: border),
            ),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(compact ? 8 : 10),
              child: Icon(icon, size: compact ? 16 : 17, color: iconColor),
            ),
          ),
        ),
      ),
    );
  }
}

class _SquareSendBtn extends StatelessWidget {
  const _SquareSendBtn({required this.enabled, required this.onTap, required this.icon});

  final bool enabled;
  final VoidCallback onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final disabledBg = isLight ? AppColors.lightRaised : AppColors.surfaceSoft;
    final disabledIcon = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          gradient: enabled ? AppGradients.buttonPrimary : null,
          color: enabled ? null : disabledBg,
          border: Border.all(color: enabled ? Colors.transparent : border),
          boxShadow: enabled
              ? <BoxShadow>[
                  BoxShadow(
                    color: const Color(0xFF2F63FF).withValues(alpha: 0.24),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Ink(
          child: InkWell(
            onTap: enabled ? onTap : null,
            child: SizedBox(
              width: 40,
              height: 38,
              child: Icon(
                icon,
                size: 19,
                color: enabled ? Colors.white : disabledIcon,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InlineSelect extends StatelessWidget {
  const _InlineSelect({
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String value;
  final List<String> items;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final bg = isLight ? AppColors.lightRaised : AppColors.surfaceSoft;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final text = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    final iconColor = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isDense: true,
          dropdownColor: isLight ? AppColors.lightSurface : AppColors.surfaceBase,
          icon: Icon(
            Icons.keyboard_arrow_down_rounded,
            size: 18,
            color: iconColor,
          ),
          style: TextStyle(
            color: text,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
          items: items
              .map((v) => DropdownMenuItem<String>(value: v, child: Text(v)))
              .toList(),
          onChanged: onChanged == null ? null : (v) => onChanged!(v!),
        ),
      ),
    );
  }
}

class _MobileInfoCard extends StatelessWidget {
  const _MobileInfoCard({required this.title, required this.rows});

  final String title;
  final List<_MobileInfoRow> rows;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final titleColor = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final muted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    final secondary = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
        gradient: isLight
            ? null
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF081326), Color(0xFF06101F)],
              ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: titleColor, fontSize: 23, fontWeight: FontWeight.w700, letterSpacing: -0.2)),
          const SizedBox(height: 10),
          ...rows.map(
            (r) => Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: Row(
                children: [
                  if (r.icon != null) ...[
                    Icon(r.icon, size: 15, color: muted),
                    const SizedBox(width: 8),
                  ],
                  Expanded(child: Text(r.label, style: TextStyle(color: muted, fontSize: 16))),
                  Text(r.value, style: TextStyle(color: secondary, fontSize: 16, fontWeight: FontWeight.w600)),
                  if (r.trailingArrow) ...[
                    const SizedBox(width: 6),
                    Icon(Icons.chevron_right_rounded, size: 17, color: muted),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MobileInfoRow {
  const _MobileInfoRow({
    required this.label,
    required this.value,
    this.icon,
    this.trailingArrow = false,
  });

  final String label;
  final String value;
  final IconData? icon;
  final bool trailingArrow;
}

class _MobileStatTiny extends StatelessWidget {
  const _MobileStatTiny({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final primary = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final muted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: TextStyle(color: primary, fontSize: 26, fontWeight: FontWeight.w700)),
          Text(label, style: TextStyle(color: muted, fontSize: 12.5)),
        ],
      ),
    );
  }
}

class _MobileMetricCard extends StatelessWidget {
  const _MobileMetricCard({
    required this.label,
    required this.valueText,
    required this.subtitle,
    required this.chip,
    required this.color,
    required this.metrics,
    required this.selector,
  });

  final String label;
  final String valueText;
  final String subtitle;
  final String chip;
  final Color color;
  final List<DeviceMetric> metrics;
  final double Function(DeviceMetric) selector;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final titleColor = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final muted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Text(label, style: TextStyle(color: titleColor, fontSize: 22, fontWeight: FontWeight.w600)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isLight ? AppColors.lightRaised : AppColors.surfaceSoft,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(chip, style: TextStyle(color: muted, fontSize: 11.5)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(valueText, style: TextStyle(color: color, fontSize: 42, fontWeight: FontWeight.w700)),
              const SizedBox(width: 10),
              Expanded(child: Text(subtitle, style: TextStyle(color: muted, fontSize: 14))),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 120,
            child: _MetricMiniChart(metrics: metrics, selector: selector, color: color),
          ),
        ],
      ),
    );
  }
}

class _MetricMiniChart extends StatelessWidget {
  const _MetricMiniChart({required this.metrics, required this.selector, required this.color});

  final List<DeviceMetric> metrics;
  final double Function(DeviceMetric) selector;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final pts = metrics.reversed.toList();
    final spots = pts.asMap().entries.map((e) => FlSpot(e.key.toDouble(), selector(e.value).clamp(0, 100))).toList();
    return LineChart(
      LineChartData(
        minY: 0,
        maxY: 100,
        gridData: FlGridData(show: true, drawVerticalLine: true, horizontalInterval: 25, verticalInterval: 1, getDrawingHorizontalLine: (_) => const FlLine(color: Color(0x1C8EA3C1), strokeWidth: 1), getDrawingVerticalLine: (_) => const FlLine(color: Color(0x142B3F62), strokeWidth: 1)),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 26, interval: 50, getTitlesWidget: (v, _) => Text('${v.toInt()}%', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)))),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, interval: 1, getTitlesWidget: (v, _) {
            if (spots.isEmpty) return const SizedBox.shrink();
            final last = spots.length - 1;
            if (v.toInt() == 0) return const Text('30m', style: TextStyle(color: AppColors.textMuted, fontSize: 10));
            if (v.toInt() == (last / 3).round()) return const Text('20m', style: TextStyle(color: AppColors.textMuted, fontSize: 10));
            if (v.toInt() == ((last * 2) / 3).round()) return const Text('10m', style: TextStyle(color: AppColors.textMuted, fontSize: 10));
            if (v.toInt() == last) return const Text('Ahora', style: TextStyle(color: AppColors.textMuted, fontSize: 10));
            return const SizedBox.shrink();
          })),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: color,
            barWidth: 2.4,
            isStrokeCapRound: true,
            dotData: FlDotData(show: true, checkToShowDot: (s, _) => s.x == spots.last.x),
            belowBarData: BarAreaData(show: true, gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [color.withValues(alpha: 0.35), color.withValues(alpha: 0.04)])),
          ),
        ],
      ),
    );
  }
}

class _SysInfoItem extends StatelessWidget {
  const _SysInfoItem({required this.icon, required this.label, required this.value, this.valueColor});
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 11, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
          ]),
          const SizedBox(height: 3),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: valueColor ?? AppColors.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _SysInfoDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(width: 1, height: 30, margin: const EdgeInsets.symmetric(horizontal: 12), color: AppColors.borderSubtle);
}

// ── Metric cards ───────────────────────────────────────────────────────────

class _MetricAreaCard extends StatelessWidget {
  const _MetricAreaCard({
    required this.label,
    required this.icon,
    required this.value,
    required this.subtitle,
    required this.color,
    required this.metrics,
    required this.selector,
  });

  final String label;
  final IconData icon;
  final double value;
  final String subtitle;
  final Color color;
  final List<DeviceMetric> metrics;
  final double Function(DeviceMetric) selector;

  @override
  Widget build(BuildContext context) {
    final pts = metrics.reversed.toList();
    final spots = pts.asMap().entries
        .map((e) => FlSpot(e.key.toDouble(), selector(e.value).clamp(0, 100)))
        .toList();
    const chartH = 120.0;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceBase,
        borderRadius: AppRadii.md,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row: icon + label
          Row(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 17, color: color),
              ),
              const SizedBox(width: 10),
              Text(label, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 12),
          // Percentage value
          Text(
            '${value.toStringAsFixed(0)}%',
            style: TextStyle(
              fontSize: 38,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: -2,
              height: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 14),
          // Chart
          SizedBox(
            height: chartH,
            child: spots.length < 2
                ? Center(child: Text('Sin datos', style: TextStyle(color: AppColors.textMuted.withValues(alpha: 0.5), fontSize: 11)))
                : LineChart(
                    LineChartData(
                      minY: 0, maxY: 100,
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: 50,
                        getDrawingHorizontalLine: (_) => FlLine(color: AppColors.borderSubtle, strokeWidth: 1),
                      ),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 32,
                            interval: 50,
                            getTitlesWidget: (v, _) {
                              if (v == 0 || v == 50 || v == 100) {
                                return Text('${v.toInt()}%', style: const TextStyle(fontSize: 9, color: AppColors.textMuted));
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 18,
                            getTitlesWidget: (v, _) {
                              final idx = v.toInt();
                              if (idx < 0 || idx >= pts.length) return const SizedBox.shrink();
                              final step = (pts.length / 5).ceil().clamp(1, pts.length);
                              if (idx % step == 0 || idx == pts.length - 1) {
                                final t = pts[idx].createdAt;
                                final label = idx == pts.length - 1
                                    ? 'Ahora'
                                    : '${t.hour}:${t.minute.toString().padLeft(2, '0')}';
                                return Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted));
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                        ),
                      ),
                      lineBarsData: [
                        LineChartBarData(
                          spots: spots,
                          isCurved: true,
                          color: color,
                          barWidth: 2,
                          dotData: FlDotData(
                            show: true,
                            getDotPainter: (spot, percent, barData, index) {
                              if (index == spots.length - 1) {
                                return FlDotCirclePainter(
                                  radius: 4,
                                  color: Colors.white,
                                  strokeWidth: 2,
                                  strokeColor: color,
                                );
                              }
                              return FlDotCirclePainter(
                                radius: 0,
                                color: Colors.transparent,
                                strokeWidth: 0,
                                strokeColor: Colors.transparent,
                              );
                            },
                          ),
                          belowBarData: BarAreaData(
                            show: true,
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [color.withValues(alpha: 0.4), color.withValues(alpha: 0.0)],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _MetricCardSkeleton extends StatelessWidget {
  const _MetricCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceBase,
        borderRadius: AppRadii.md,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 40, height: 12, decoration: BoxDecoration(color: AppColors.surfaceSoft, borderRadius: BorderRadius.circular(4))),
        const SizedBox(height: 10),
        Container(width: 80, height: 34, decoration: BoxDecoration(color: AppColors.surfaceSoft, borderRadius: BorderRadius.circular(6))),
        const SizedBox(height: 6),
        Container(width: 120, height: 10, decoration: BoxDecoration(color: AppColors.surfaceSoft, borderRadius: BorderRadius.circular(4))),
      ]),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
        child: Column(children: [
          Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 13, color: color, fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }
}

class _MetricTimelineChart extends StatelessWidget {
  const _MetricTimelineChart({required this.metrics});
  final List<DeviceMetric> metrics;

  @override
  Widget build(BuildContext context) {
    final points = metrics.reversed.toList();
    if (points.isEmpty) return const SizedBox.shrink();
    List<FlSpot> spots(double Function(DeviceMetric m) sel) =>
        List.generate(points.length, (i) => FlSpot(i.toDouble(), sel(points[i]).clamp(0, 100)));

    return LineChart(LineChartData(
      minY: 0, maxY: 100,
      gridData: FlGridData(
        show: true,
        getDrawingHorizontalLine: (_) => FlLine(color: AppColors.borderSubtle, strokeWidth: 1),
        getDrawingVerticalLine: (_) => FlLine(color: AppColors.borderSubtle, strokeWidth: 1),
      ),
      titlesData: const FlTitlesData(
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 32)),
        rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(border: Border.all(color: AppColors.borderSubtle)),
      lineBarsData: [
        LineChartBarData(spots: spots((m) => m.cpuPercent), isCurved: true, color: AppColors.accentGreen, barWidth: 2, dotData: const FlDotData(show: false)),
        LineChartBarData(spots: spots((m) => m.ramPercent), isCurved: true, color: AppColors.accentCyan, barWidth: 2, dotData: const FlDotData(show: false)),
        LineChartBarData(spots: spots((m) => m.diskPercent), isCurved: true, color: AppColors.accentAmber, barWidth: 2, dotData: const FlDotData(show: false)),
      ],
    ));
  }
}

// ── AI typing indicator ────────────────────────────────────────────────────

class _AiTypingIndicator extends StatefulWidget {
  const _AiTypingIndicator();

  @override
  State<_AiTypingIndicator> createState() => _AiTypingIndicatorState();
}

class _AiTypingIndicatorState extends State<_AiTypingIndicator> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(animation: _ctrl, builder: (context, _) {
      double pulse(int i) {
        final t = (_ctrl.value + (i * 0.18)) % 1.0;
        final v = t < 0.5 ? t * 2 : (1 - t) * 2;
        return 0.45 + v * 0.55;
      }
      Widget dot(int i) {
        return Opacity(opacity: pulse(i), child: Container(
          width: 6 + pulse(i) * 2, height: 6 + pulse(i) * 2,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          decoration: const BoxDecoration(color: Colors.greenAccent, shape: BoxShape.circle),
        ));
      }
      return Row(mainAxisSize: MainAxisSize.min, children: [
        const Text('[assistant]', style: TextStyle(color: Colors.greenAccent, fontFamily: 'Consolas', fontSize: 12)),
        const SizedBox(width: 8),
        dot(0), dot(1), dot(2),
      ]);
    });
  }
}
