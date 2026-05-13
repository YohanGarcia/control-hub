import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_config.dart';
import '../../core/design_tokens.dart';
import '../../core/providers.dart';
import '../../core/ws_client.dart';
import '../../shared/ui_components.dart';
import 'device_detail_page.dart';
import 'enrollment_models.dart';
import 'device_metric_model.dart';
import 'device_models.dart';
import 'device_service.dart';

class DevicesPage extends ConsumerStatefulWidget {
  const DevicesPage({super.key});

  @override
  ConsumerState<DevicesPage> createState() => _DevicesPageState();
}

class _DevicesPageState extends ConsumerState<DevicesPage> {
  late final DeviceService _deviceService;
  final WsClient _wsClient = WsClient();
  StreamSubscription<Map<String, dynamic>>? _wsSub;
  late Future<List<Device>> _future;
  List<Device> _devices = [];
  final Map<int, DeviceMetric> _latestMetricsByDevice = {};
  bool _wsConnected = false;
  bool _reconnecting = false;
  int _reconnectAttempts = 0;
  Device? _selectedDevice;
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';
  _MobileDeviceFilter _mobileFilter = _MobileDeviceFilter.all;
  List<OrganizationItem> _organizations = <OrganizationItem>[];
  List<OrganizationMembershipItem> _memberships = <OrganizationMembershipItem>[];
  int? _selectedOrganizationId;

  @override
  void initState() {
    super.initState();
    _deviceService = ref.read(deviceServiceProvider);
    _future = Future.value(<Device>[]);
    unawaited(_loadOrganizations());
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    _wsClient.disconnect();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onWsEvent(Map<String, dynamic> event) {
    final type = event['type'];
    final deviceId = event['device_id'];
    if (type == 'client.device.status.updated' && deviceId is int) {
      setState(() {
        _devices = _devices
            .map((d) => d.id == deviceId
                ? Device(id: d.id, name: d.name, hostType: d.hostType, isOnline: event['is_online'] as bool? ?? d.isOnline, osName: d.osName, agentVersion: d.agentVersion)
                : d)
            .toList();
        if (_selectedDevice?.id == deviceId) {
          _selectedDevice = _devices.firstWhere((d) => d.id == deviceId);
        }
      });
    }
    if (type == 'client.device.metric.updated' && deviceId is int) {
      final metric = event['metric'];
      if (metric is Map<String, dynamic>) {
        setState(() => _latestMetricsByDevice[deviceId] = DeviceMetric.fromJson(metric));
      }
    }
  }

  void _connectWs(String token) {
    final apiBase = ref.read(appSettingsProvider).apiBaseUrl;
    final wsBase = AppConfig.wsFromApi(apiBase);
    _wsSub?.cancel();
    _wsSub = _wsClient.connect(wsBaseUrl: wsBase, token: token).listen(
      _onWsEvent,
      onError: (_) => _scheduleReconnect(),
      onDone: _scheduleReconnect,
    );
    if (mounted) setState(() { _wsConnected = true; _reconnectAttempts = 0; });
  }

  void _scheduleReconnect() {
    if (!mounted || _reconnecting) return;
    _reconnecting = true;
    _reconnectAttempts++;
    setState(() => _wsConnected = false);
    final delay = _reconnectAttempts <= 1 ? 2 : (_reconnectAttempts <= 3 ? 4 : (_reconnectAttempts <= 5 ? 8 : 15));
    Future<void>.delayed(Duration(seconds: delay), () {
      _reconnecting = false;
      final token = ref.read(sessionStoreProvider).accessToken;
      if (!mounted || token == null) return;
      _connectWs(token);
    });
  }

  Future<List<Device>> _load() async {
    final token = ref.read(sessionStoreProvider).accessToken;
    if (token == null || token.isEmpty) return [];
    final list = await _deviceService.fetchDevices();
    if (mounted) {
      setState(() {
        _devices = list;
        if (list.isNotEmpty && _selectedDevice == null) {
          _selectedDevice = list.first;
        } else if (_selectedDevice != null) {
          final matches = list.where((d) => d.id == _selectedDevice!.id);
          if (matches.isNotEmpty) _selectedDevice = matches.first;
        }
      });
    }
    return list;
  }

  Future<void> _loadOrganizations() async {
    final orgs = await _deviceService.fetchOrganizations();
    final memberships = await _deviceService.fetchOrganizationMemberships();
    if (!mounted) return;
    if (orgs.isEmpty) {
      context.go('/no-org');
      return;
    }
    final session = ref.read(sessionStoreProvider);
    int? selected = session.selectedOrganizationId;
    if (selected == null || !orgs.any((o) => o.id == selected)) {
      selected = orgs.isEmpty ? null : orgs.first.id;
    }
    if (!mounted) return;
    setState(() {
      _organizations = orgs;
      _memberships = memberships;
      _selectedOrganizationId = selected;
    });
    if (selected != null) {
      await session.saveSelectedOrganizationId(selected);
    }
    _future = _load();
    if (!mounted) return;
    final token = ref.read(sessionStoreProvider).accessToken;
    if (token != null) _connectWs(token);
  }

  Future<void> _onSelectOrganization(int orgId) async {
    await ref.read(sessionStoreProvider).saveSelectedOrganizationId(orgId);
    if (!mounted) return;
    setState(() {
      _selectedOrganizationId = orgId;
      _future = _load();
    });
  }

  OrganizationMembershipItem? get _selectedMembership {
    final orgId = _selectedOrganizationId;
    if (orgId == null) return null;
    final found = _memberships.where((m) => m.organizationId == orgId);
    return found.isEmpty ? null : found.first;
  }

  List<Device> get _filteredDevices {
    if (_searchQuery.isEmpty) return _devices;
    final q = _searchQuery.toLowerCase();
    return _devices.where((d) =>
        d.name.toLowerCase().contains(q) ||
        d.hostType.toLowerCase().contains(q) ||
        (d.osName?.toLowerCase().contains(q) ?? false)).toList();
  }

  Future<void> _logout() async {
    final router = GoRouter.of(context);
    await ref.read(authControllerProvider.notifier).logout();
    if (!mounted) return;
    router.go('/login');
  }

  Future<void> _openEnrollmentDialog() async {
    final organizations = await _deviceService.fetchOrganizations();
    if (!mounted) return;
    if (organizations.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No tienes organizaciones disponibles para registrar dispositivos.')),
      );
      return;
    }

    OrganizationItem selectedOrg = organizations.first;
    int expiresInSeconds = 600;
    int maxUses = 1;
    String deviceName = 'Mi-PC';
    EnrollmentTokenCreated? created;
    List<EnrollmentTokenItem> tokens = <EnrollmentTokenItem>[];
    bool loadingTokens = true;

    Future<void> reloadTokens(StateSetter setStateDialog) async {
      setStateDialog(() => loadingTokens = true);
      tokens = await _deviceService.fetchEnrollmentTokens(organizationId: selectedOrg.id);
      if (!mounted) return;
      setStateDialog(() => loadingTokens = false);
    }

    Future<void> verifyAgentConnected(StateSetter setStateDialog) async {
      final list = await _deviceService.fetchDevices();
      if (!mounted) return;
      final normalized = deviceName.trim().toLowerCase();
      final found = list.where((d) => d.name.trim().toLowerCase() == normalized).toList();
      if (found.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Aun no aparece el dispositivo. Verifica que el agente se haya ejecutado.')),
        );
        return;
      }
      final online = found.any((d) => d.isOnline);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(online ? 'Dispositivo detectado y online.' : 'Dispositivo detectado, pero offline.')),
      );
      setState(() {
        _devices = list;
      });
      setStateDialog(() {});
    }

    String windowsCommand(String token) {
      final safeName = deviceName.trim().isEmpty ? 'Mi-PC' : deviceName.trim();
      final baseUrl = ref.read(appSettingsProvider).apiBaseUrl.replaceAll('/api/v1', '');
      return 'python agent.py --server $baseUrl --enroll-token $token --device-name "$safeName"';
    }

    String linuxCommand(String token) {
      final safeName = deviceName.trim().isEmpty ? 'mi-linux' : deviceName.trim();
      final baseUrl = ref.read(appSettingsProvider).apiBaseUrl.replaceAll('/api/v1', '');
      return 'python agent.py --server $baseUrl --enroll-token $token --device-name "$safeName" --host-type linux';
    }

    // ignore: use_build_context_synchronously
    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            if (loadingTokens) {
              unawaited(reloadTokens(setStateDialog));
            }
            return AlertDialog(
              title: const Text('Agregar dispositivo (enrollment)'),
              content: SizedBox(
                width: 640,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      DropdownButtonFormField<int>(
                        initialValue: selectedOrg.id,
                        decoration: const InputDecoration(labelText: 'Organizacion'),
                        items: organizations
                            .map((o) => DropdownMenuItem<int>(value: o.id, child: Text('${o.name} (${o.slug})')))
                            .toList(),
                        onChanged: (v) {
                          if (v == null) return;
                          selectedOrg = organizations.firstWhere((o) => o.id == v);
                          created = null;
                          loadingTokens = true;
                          setStateDialog(() {});
                        },
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        decoration: const InputDecoration(
                          labelText: 'Nombre del dispositivo para el comando',
                          hintText: 'Ej: oficina-pc-01',
                        ),
                        initialValue: deviceName,
                        onChanged: (v) => deviceName = v,
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<int>(
                              initialValue: expiresInSeconds,
                              decoration: const InputDecoration(labelText: 'Expira en'),
                              items: const [
                                DropdownMenuItem(value: 300, child: Text('5 minutos')),
                                DropdownMenuItem(value: 600, child: Text('10 minutos')),
                                DropdownMenuItem(value: 1800, child: Text('30 minutos')),
                                DropdownMenuItem(value: 3600, child: Text('60 minutos')),
                              ],
                              onChanged: (v) {
                                if (v == null) return;
                                setStateDialog(() => expiresInSeconds = v);
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: DropdownButtonFormField<int>(
                              initialValue: maxUses,
                              decoration: const InputDecoration(labelText: 'Usos maximos'),
                              items: const [
                                DropdownMenuItem(value: 1, child: Text('1')),
                                DropdownMenuItem(value: 3, child: Text('3')),
                                DropdownMenuItem(value: 5, child: Text('5')),
                              ],
                              onChanged: (v) {
                                if (v == null) return;
                                setStateDialog(() => maxUses = v);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      FilledButton.icon(
                        onPressed: () async {
                          final token = await _deviceService.createEnrollmentToken(
                            organizationId: selectedOrg.id,
                            expiresInSeconds: expiresInSeconds,
                            maxUses: maxUses,
                          );
                          created = token;
                          await reloadTokens(setStateDialog);
                          setStateDialog(() {});
                        },
                        icon: const Icon(Icons.vpn_key_rounded),
                        label: const Text('Generar token'),
                      ),
                      if (created != null) ...[
                        const SizedBox(height: 12),
                        SelectableText('Token: ${created!.token}'),
                        const SizedBox(height: 8),
                        SelectableText(
                          'Windows:\n${windowsCommand(created!.token)}',
                        ),
                        const SizedBox(height: 6),
                        SelectableText(
                          'Linux:\n${linuxCommand(created!.token)}',
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            OutlinedButton.icon(
                              onPressed: () {
                                unawaited(Clipboard.setData(ClipboardData(text: created!.token)));
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  const SnackBar(content: Text('Token copiado al portapapeles')),
                                );
                              },
                              icon: const Icon(Icons.copy_rounded),
                              label: const Text('Copiar token'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton.icon(
                              onPressed: () {
                                unawaited(Clipboard.setData(ClipboardData(text: windowsCommand(created!.token))));
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  const SnackBar(content: Text('Comando Windows copiado')),
                                );
                              },
                              icon: const Icon(Icons.terminal_rounded),
                              label: const Text('Copiar comando Win'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton.icon(
                              onPressed: () {
                                unawaited(Clipboard.setData(ClipboardData(text: linuxCommand(created!.token))));
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  const SnackBar(content: Text('Comando Linux copiado')),
                                );
                              },
                              icon: const Icon(Icons.computer_rounded),
                              label: const Text('Copiar comando Linux'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton.icon(
                              onPressed: () => verifyAgentConnected(setStateDialog),
                              icon: const Icon(Icons.wifi_protected_setup_rounded),
                              label: const Text('Verificar conexion'),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 14),
                      const Text('Tokens recientes', style: TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      if (loadingTokens)
                        const Padding(
                          padding: EdgeInsets.all(8),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else if (tokens.isEmpty)
                        const Text('No hay tokens aun')
                      else
                        ...tokens.take(8).map((t) => ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text('Token #${t.id} · usos ${t.usedCount}/${t.maxUses}'),
                              subtitle: Text(
                                t.isConsumed
                                    ? 'Consumido'
                                    : 'Expira: ${t.expiresAt.toLocal().toIso8601String().substring(0, 19)}',
                              ),
                              trailing: t.isConsumed
                                  ? const Icon(Icons.lock_clock_outlined, size: 18)
                                  : IconButton(
                                      tooltip: 'Revocar',
                                      onPressed: () async {
                                        await _deviceService.revokeEnrollmentToken(
                                          organizationId: selectedOrg.id,
                                          tokenId: t.id,
                                        );
                                        await reloadTokens(setStateDialog);
                                      },
                                      icon: const Icon(Icons.delete_outline_rounded, size: 18),
                                    ),
                            )),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cerrar')),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 1024;
    final wsBase = AppConfig.wsFromApi(ref.read(appSettingsProvider).apiBaseUrl);

    if (isDesktop) return _buildDesktopLayout(wsBase);
    return _buildMobileLayout(wsBase);
  }

  Widget _buildDesktopLayout(String wsBase) {
    return Scaffold(
      backgroundColor: AppColors.deepBg,
      body: Row(
        children: [
          _DeviceSidebar(
            devices: _filteredDevices,
            allDevices: _devices,
            selectedDevice: _selectedDevice,
            wsConnected: _wsConnected,
            reconnectAttempts: _reconnectAttempts,
            latestMetrics: _latestMetricsByDevice,
            searchController: _searchCtrl,
            onSearch: (q) => setState(() => _searchQuery = q),
            onSelect: (d) => setState(() => _selectedDevice = d),
            onLogout: _logout,
            onNavigateSettings: () => context.push('/settings'),
            onNavigateRuns: () => context.push('/runs', extra: _devices),
            onRefresh: () => setState(() => _future = _load()),
            onAddDevice: _openEnrollmentDialog,
            organizations: _organizations,
            selectedOrganizationId: _selectedOrganizationId,
            onSelectOrganization: _onSelectOrganization,
            membership: _selectedMembership,
          ),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              child: _selectedDevice == null
                  ? _buildNoSelection()
                  : DeviceDetailPage(
                      key: ValueKey(_selectedDevice!.id),
                      device: _selectedDevice!,
                      wsBaseUrl: wsBase,
                      embedded: true,
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileLayout(String wsBase) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: FutureBuilder<List<Device>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && _devices.isEmpty) {
            return ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: 5,
              itemBuilder: (_, __) => const SkeletonCard(),
            );
          }
          if (snapshot.hasError && _devices.isEmpty) {
            return EmptyState(
              icon: Icons.error_outline,
              title: 'Error al cargar',
              subtitle: snapshot.error.toString(),
              action: FilledButton.tonal(onPressed: () => setState(() => _future = _load()), child: const Text('Reintentar')),
            );
          }
          final devices = _devices.isEmpty ? (snapshot.data ?? <Device>[]) : _devices;
          final filteredDevices = _filterMobileDevices(devices);
          if (devices.isEmpty) {
            return const EmptyState(icon: Icons.devices, title: 'Sin dispositivos', subtitle: 'No hay dispositivos registrados aun.');
          }
          return RefreshIndicator(
            onRefresh: () async { setState(() => _future = _load()); await _future; },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(14, 6, 14, 16),
              children: [
                _buildMobileTopBar(isLight),
                const SizedBox(height: 12),
                _buildMobileSearch(isLight),
                const SizedBox(height: 10),
                _buildMobileFilterRow(devices, isLight),
                const SizedBox(height: 10),
                ...filteredDevices.map((d) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _MobileDeviceItem(
                    device: d,
                    ip: _deviceIp(d),
                    statusText: _deviceStatusText(d),
                    statusColor: _deviceStatusColor(d),
                    isLight: isLight,
                    onTap: () => context.push('/device/${d.id}', extra: d),
                  ),
                )),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: _buildMobileBottomNav(isLight),
    );
  }

  Widget _buildMobileTopBar(bool isLight) {
    final titleColor = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final secondary = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.menu_rounded, color: secondary),
              const SizedBox(width: 10),
              Text('Dispositivos', style: TextStyle(color: titleColor, fontSize: 29, fontWeight: FontWeight.w700, letterSpacing: -0.25)),
              const Spacer(),
              GestureDetector(
                onTap: _openEnrollmentDialog,
                child: Icon(Icons.add, color: secondary, size: 22),
              ),
            ],
          ),
          if (_organizations.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              height: 34,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                color: isLight ? AppColors.lightSurface : AppColors.surfaceBase,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isLight ? AppColors.lightBorder : AppColors.borderSubtle),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<int>(
                  value: _selectedOrganizationId ?? _organizations.first.id,
                  isDense: true,
                  icon: Icon(Icons.keyboard_arrow_down_rounded, color: secondary),
                  items: _organizations
                      .map((o) => DropdownMenuItem<int>(value: o.id, child: Text(o.name, style: TextStyle(color: titleColor, fontSize: 12))))
                      .toList(),
                  onChanged: (v) {
                    if (v == null) return;
                    unawaited(_onSelectOrganization(v));
                  },
                ),
              ),
            ),
            if (_selectedMembership != null) ...[
              const SizedBox(height: 6),
              Text(
                'Rol: ${_selectedMembership!.role} · Org: ${_selectedMembership!.organizationName}',
                style: TextStyle(color: secondary, fontSize: 11.5, fontWeight: FontWeight.w600),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildMobileSearch(bool isLight) {
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final text = isLight ? AppColors.lightTextPrimary : AppColors.textSecondary;
    final hint = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    return Container(
      height: 38,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: TextField(
        controller: _searchCtrl,
        onChanged: (v) => setState(() => _searchQuery = v),
        style: TextStyle(color: text, fontSize: 14),
        decoration: InputDecoration(
          hintText: 'Buscar dispositivos...',
          hintStyle: TextStyle(color: hint, fontSize: 14),
          prefixIcon: Icon(Icons.search_rounded, size: 18, color: hint),
          suffixIcon: Padding(
            padding: EdgeInsets.only(right: 12, top: 10, bottom: 10),
            child: Text('⌘C', style: TextStyle(color: hint, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
          suffixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildMobileFilterRow(List<Device> devices, bool isLight) {
    final online = devices.where((d) => d.isOnline).length;
    final offline = devices.where((d) => !d.isOnline).length;
    final alert = devices.where(_hasAlert).length;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _mobileFilterChip(_MobileDeviceFilter.all, 'Todos', devices.length, const Color(0xFF4168FF), isLight),
          const SizedBox(width: 8),
          _mobileFilterChip(_MobileDeviceFilter.online, 'En linea', online, AppColors.accentGreen, isLight),
          const SizedBox(width: 8),
          _mobileFilterChip(_MobileDeviceFilter.alert, 'Con alerta', alert, AppColors.accentRed, isLight),
          const SizedBox(width: 8),
          _mobileFilterChip(_MobileDeviceFilter.offline, 'Offline', offline, const Color(0xFF6B7280), isLight),
        ],
      ),
    );
  }

  Widget _mobileFilterChip(_MobileDeviceFilter filter, String label, int count, Color badgeColor, bool isLight) {
    final selected = _mobileFilter == filter;
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final text = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;
    return GestureDetector(
      onTap: () => setState(() => _mobileFilter = filter),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF3C63F5) : cardBg,
          borderRadius: BorderRadius.circular(9),
          border: Border.all(color: selected ? const Color(0xFF4E73FF) : border),
        ),
        child: Row(
          children: [
            Text(label, style: TextStyle(color: selected ? Colors.white : text, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(color: badgeColor.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(999)),
              child: Text('$count', style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileBottomNav(bool isLight) {
    Widget item({required bool selected, required IconData icon, required String label, required VoidCallback onTap}) {
      final color = selected ? const Color(0xFF6B85FF) : (isLight ? AppColors.lightTextSecondary : AppColors.textMuted);
      return Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            color: Colors.transparent,
            padding: const EdgeInsets.symmetric(vertical: 7),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(height: 4),
                Text(label, style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  width: 18,
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
          color: isLight ? AppColors.lightSurface : const Color(0xFF060D1A),
          border: Border(top: BorderSide(color: isLight ? AppColors.lightBorder : AppColors.borderSubtle)),
        ),
        child: Row(
          children: [
            item(selected: false, icon: Icons.grid_view_outlined, label: 'Resumen', onTap: () {}),
            item(selected: true, icon: Icons.devices_outlined, label: 'Dispositivos', onTap: () {}),
            item(selected: false, icon: Icons.terminal_rounded, label: 'Terminal', onTap: () => context.push('/runs', extra: _devices)),
            item(selected: false, icon: Icons.notifications_none_rounded, label: 'Alertas', onTap: () {}),
            item(selected: false, icon: Icons.more_horiz_rounded, label: 'Más', onTap: () => context.push('/settings')),
          ],
        ),
      ),
    );
  }

  List<Device> _filterMobileDevices(List<Device> devices) {
    final base = _searchQuery.trim().isEmpty
        ? devices
        : devices.where((d) {
            final q = _searchQuery.toLowerCase();
            return d.name.toLowerCase().contains(q) ||
                d.hostType.toLowerCase().contains(q) ||
                (_deviceIp(d).contains(q));
          }).toList();

    return base.where((d) {
      switch (_mobileFilter) {
        case _MobileDeviceFilter.online:
          return d.isOnline;
        case _MobileDeviceFilter.offline:
          return !d.isOnline;
        case _MobileDeviceFilter.alert:
          return _hasAlert(d);
        case _MobileDeviceFilter.all:
          return true;
      }
    }).toList();
  }

  bool _hasAlert(Device device) {
    final metric = _latestMetricsByDevice[device.id];
    return metric != null && (metric.cpuPercent >= 85 || metric.ramPercent >= 90 || metric.diskPercent >= 90);
  }

  String _deviceIp(Device d) => '192.168.1.${(10 + d.id).clamp(10, 250)}';

  String _deviceStatusText(Device d) {
    if (!d.isOnline) return 'Desconectado';
    if (_hasAlert(d)) return 'Advertencia';
    if (d.name.toLowerCase().contains('backup')) return 'En mantenimiento';
    return 'En linea';
  }

  Color _deviceStatusColor(Device d) {
    if (!d.isOnline) return AppColors.accentRed;
    if (_hasAlert(d)) return AppColors.accentAmber;
    if (d.name.toLowerCase().contains('backup')) return const Color(0xFF2DA1FF);
    return AppColors.accentGreen;
  }

  Widget _buildNoSelection() {
    return Container(
      color: AppColors.deepBg,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: AppColors.surfaceRaised,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: const Icon(Icons.dns_rounded, size: 40, color: AppColors.textMuted),
            ),
            const SizedBox(height: 20),
            Text('Selecciona un dispositivo', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            const Text('Elige un servidor del panel izquierdo para ver sus detalles.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

enum _MobileDeviceFilter { all, online, alert, offline }

class _MobileDeviceItem extends StatelessWidget {
  const _MobileDeviceItem({
    required this.device,
    required this.ip,
    required this.statusText,
    required this.statusColor,
    required this.isLight,
    required this.onTap,
  });

  final Device device;
  final String ip;
  final String statusText;
  final Color statusColor;
  final bool isLight;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cardBg = isLight ? AppColors.lightSurface : AppColors.surfaceBase;
    final border = isLight ? AppColors.lightBorder : AppColors.borderSubtle;
    final raised = isLight ? AppColors.lightRaised : AppColors.surfaceRaised;
    final textPrimary = isLight ? AppColors.lightTextPrimary : AppColors.textPrimary;
    final textMuted = isLight ? AppColors.lightTextSecondary : AppColors.textMuted;
    final textSecondary = isLight ? AppColors.lightTextSecondary : AppColors.textSecondary;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: raised,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: border),
              ),
              child: Icon(_iconForType(device.hostType), size: 19, color: textSecondary),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(device.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Container(width: 7, height: 7, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                      const SizedBox(width: 6),
                      Text(statusText, style: TextStyle(color: statusColor, fontSize: 13, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(ip, style: TextStyle(color: textMuted, fontSize: 12.5)),
                const SizedBox(height: 4),
                Icon(Icons.more_vert, size: 18, color: textMuted),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static IconData _iconForType(String hostType) {
    final t = hostType.toLowerCase();
    if (t.contains('db') || t.contains('sql')) return Icons.storage_rounded;
    if (t.contains('web')) return Icons.public;
    if (t.contains('dev')) return Icons.code_rounded;
    return Icons.dns_rounded;
  }
}

// ── Sidebar ────────────────────────────────────────────────────────────────

class _DeviceSidebar extends StatelessWidget {
  const _DeviceSidebar({
    required this.devices,
    required this.allDevices,
    required this.selectedDevice,
    required this.wsConnected,
    required this.reconnectAttempts,
    required this.latestMetrics,
    required this.searchController,
    required this.onSearch,
    required this.onSelect,
    required this.onLogout,
    required this.onNavigateSettings,
    required this.onNavigateRuns,
    required this.onRefresh,
    required this.onAddDevice,
    required this.organizations,
    required this.selectedOrganizationId,
    required this.onSelectOrganization,
    required this.membership,
  });

  final List<Device> devices;
  final List<Device> allDevices;
  final Device? selectedDevice;
  final bool wsConnected;
  final int reconnectAttempts;
  final Map<int, DeviceMetric> latestMetrics;
  final TextEditingController searchController;
  final ValueChanged<String> onSearch;
  final ValueChanged<Device> onSelect;
  final VoidCallback onLogout;
  final VoidCallback onNavigateSettings;
  final VoidCallback onNavigateRuns;
  final VoidCallback onRefresh;
  final VoidCallback onAddDevice;
  final List<OrganizationItem> organizations;
  final int? selectedOrganizationId;
  final ValueChanged<int> onSelectOrganization;
  final OrganizationMembershipItem? membership;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      decoration: const BoxDecoration(
        color: AppColors.deepBg,
        border: Border(right: BorderSide(color: AppColors.borderSubtle)),
      ),
      child: Row(
        children: [
          // Activity bar
          _ActivityBar(
            wsConnected: wsConnected,
            onSettings: onNavigateSettings,
            onRuns: onNavigateRuns,
          ),
          // Divider
          Container(width: 1, color: AppColors.borderMedium),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                const Padding(
                  padding: EdgeInsets.fromLTRB(14, 16, 14, 12),
                  child: Text(
                    'Control Center',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary, letterSpacing: -0.3),
                  ),
                ),
                if (organizations.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
                    child: SizedBox(
                      height: 32,
                      child: DropdownButtonFormField<int>(
                        initialValue: selectedOrganizationId ?? organizations.first.id,
                        decoration: InputDecoration(
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          filled: true,
                          fillColor: AppColors.surfaceBase,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(color: AppColors.borderSubtle),
                          ),
                        ),
                        dropdownColor: AppColors.surfaceBase,
                        items: organizations
                            .map((o) => DropdownMenuItem<int>(
                                  value: o.id,
                                  child: Text(o.name, style: const TextStyle(fontSize: 12, color: AppColors.textPrimary)),
                                ))
                            .toList(),
                        onChanged: (v) {
                          if (v == null) return;
                          onSelectOrganization(v);
                        },
                      ),
                    ),
                  ),
                // Search
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: SizedBox(
                    height: 34,
                    child: TextField(
                      controller: searchController,
                      onChanged: onSearch,
                      style: const TextStyle(fontSize: 12.5, color: AppColors.textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Buscar dispositivos...',
                        hintStyle: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        prefixIcon: const Icon(Icons.search_rounded, size: 15, color: AppColors.textMuted),
                        suffixIcon: Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(color: AppColors.surfaceBase, borderRadius: BorderRadius.circular(4), border: Border.all(color: AppColors.borderSubtle)),
                            child: const Text('⌘K', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                        isDense: true,
                        filled: true,
                        fillColor: AppColors.surfaceBase,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.borderSubtle)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.borderSubtle)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.accentCyan, width: 1.2)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // DISPOSITIVOS header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Row(
                    children: [
                      const Text('DISPOSITIVOS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted, letterSpacing: 0.8)),
                      const Spacer(),
                      GestureDetector(
                        onTap: onAddDevice,
                        child: Container(
                          width: 20, height: 20,
                          decoration: BoxDecoration(color: AppColors.surfaceBase, borderRadius: BorderRadius.circular(5)),
                          child: const Icon(Icons.add, size: 14, color: AppColors.textSecondary),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                // Device list
                Expanded(
                  child: devices.isEmpty
                      ? const Center(child: Text('Sin dispositivos', style: TextStyle(color: AppColors.textMuted, fontSize: 12)))
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          itemCount: devices.length,
                          itemBuilder: (context, i) {
                            final d = devices[i];
                            return _SidebarDeviceItem(
                              device: d,
                              metric: latestMetrics[d.id],
                              selected: selectedDevice?.id == d.id,
                              onTap: () => onSelect(d),
                            );
                          },
                        ),
                ),
                // User profile
                Container(
                  decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.borderSubtle))),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [AppColors.accentBlue, AppColors.accentCyan]),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(child: Text('AD', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700))),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              membership == null ? 'Sin membresia' : 'Rol: ${membership!.role}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                            ),
                            Text(
                              membership == null ? '—' : membership!.organizationName,
                              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: onLogout,
                        child: const Icon(Icons.expand_more, size: 16, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Activity bar ───────────────────────────────────────────────────────────

class _ActivityBar extends StatelessWidget {
  const _ActivityBar({required this.wsConnected, required this.onSettings, required this.onRuns});

  final bool wsConnected;
  final VoidCallback onSettings;
  final VoidCallback onRuns;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      color: const Color(0xFF020712),
      child: Column(
        children: [
          const SizedBox(height: 16),
          // Logo
          Container(
            width: 34, height: 34,
            margin: const EdgeInsets.symmetric(horizontal: 9),
            decoration: BoxDecoration(
              gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [AppColors.accentBlue, AppColors.accentCyan]),
              borderRadius: BorderRadius.circular(9),
            ),
            child: const Icon(Icons.layers_rounded, color: Colors.white, size: 18),
          ),
          const SizedBox(height: 20),
          // Nav: Devices (selected)
          _ActivityItem(icon: Icons.grid_view_rounded, selected: true, tooltip: 'Dispositivos'),
          // Nav: Metrics
          _ActivityItem(icon: Icons.bar_chart_rounded, selected: false, tooltip: 'Métricas'),
          // Nav: Runs
          _ActivityItem(icon: Icons.play_circle_outline_rounded, selected: false, tooltip: 'Runs', onTap: onRuns),
          // Nav: Alerts
          _ActivityItem(icon: Icons.notifications_outlined, selected: false, tooltip: 'Alertas'),
          const Spacer(),
          // WS status dot
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Tooltip(
              message: wsConnected ? 'WebSocket conectado' : 'Desconectado',
              child: Container(
                width: 8, height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: wsConnected ? AppColors.accentGreen : AppColors.accentRed,
                  boxShadow: wsConnected ? [BoxShadow(color: AppColors.accentGreen.withValues(alpha: 0.5), blurRadius: 5)] : null,
                ),
              ),
            ),
          ),
          // Settings
          _ActivityItem(icon: Icons.settings_outlined, selected: false, tooltip: 'Configuración', onTap: onSettings),
          const SizedBox(height: 10),
        ],
      ),
    );
  }
}

class _ActivityItem extends StatelessWidget {
  const _ActivityItem({required this.icon, required this.selected, required this.tooltip, this.onTap});

  final IconData icon;
  final bool selected;
  final String tooltip;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      preferBelow: false,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          margin: const EdgeInsets.symmetric(vertical: 3, horizontal: 8),
          decoration: BoxDecoration(
            color: selected ? AppColors.accentBlue.withValues(alpha: 0.2) : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
          ),
          child: Icon(
            icon,
            size: 18,
            color: selected ? AppColors.accentCyan : AppColors.textMuted,
          ),
        ),
      ),
    );
  }
}

// ── Device list item ────────────────────────────────────────────────────────

class _SidebarDeviceItem extends StatelessWidget {
  const _SidebarDeviceItem({
    required this.device,
    this.metric,
    required this.selected,
    required this.onTap,
  });

  final Device device;
  final DeviceMetric? metric;
  final bool selected;
  final VoidCallback onTap;

  static IconData _typeIcon(String hostType) {
    final t = hostType.toLowerCase();
    if (t.contains('db') || t.contains('database') || t.contains('sql') || t.contains('mongo')) return Icons.storage_rounded;
    if (t.contains('web') || t.contains('nginx') || t.contains('apache') || t.contains('cdn')) return Icons.language_rounded;
    if (t.contains('nas') || t.contains('backup') || t.contains('storage')) return Icons.save_alt_rounded;
    if (t.contains('dev') || t.contains('development')) return Icons.code_rounded;
    return Icons.dns_rounded;
  }

  static (Color, String) _statusInfo(Device d) {
    if (!d.isOnline) return (AppColors.textMuted, 'Desconectado');
    // Could add warning logic here based on metric thresholds
    return (AppColors.accentGreen, 'En línea');
  }

  @override
  Widget build(BuildContext context) {
    final (statusColor, statusLabel) = _statusInfo(device);
    final deviceIcon = _typeIcon(device.hostType);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? AppColors.accentBlue.withValues(alpha: 0.14) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.accentBlue.withValues(alpha: 0.35) : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            // Device type icon
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                color: selected ? AppColors.accentBlue.withValues(alpha: 0.2) : AppColors.surfaceBase,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(deviceIcon, size: 16, color: selected ? AppColors.accentCyan : AppColors.textSecondary),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    device.name,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: selected ? AppColors.textPrimary : AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Container(
                        width: 5, height: 5,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: statusColor,
                          boxShadow: device.isOnline ? [BoxShadow(color: statusColor.withValues(alpha: 0.6), blurRadius: 4)] : null,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(statusLabel, style: TextStyle(fontSize: 11, color: statusColor)),
                    ],
                  ),
                ],
              ),
            ),
            // Three-dot menu
            Icon(Icons.more_vert, size: 15, color: selected ? AppColors.textMuted : const Color(0x00000000)),
          ],
        ),
      ),
    );
  }
}
