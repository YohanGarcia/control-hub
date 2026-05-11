import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../devices/device_models.dart';
import 'action_models.dart';

class GlobalRunsPage extends ConsumerStatefulWidget {
  const GlobalRunsPage({
    super.key,
    required this.devices,
  });

  final List<Device> devices;

  @override
  ConsumerState<GlobalRunsPage> createState() => _GlobalRunsPageState();
}

class _GlobalRunsPageState extends ConsumerState<GlobalRunsPage> {
  late Future<List<ActionRun>> _future;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<ActionRun>> _load() {
    return ref.read(actionServiceProvider).fetchGlobalRuns(
      deviceIds: widget.devices.map((d) => d.id).toList(),
      takePerDevice: 30,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Historial global de runs')),
      body: FutureBuilder<List<ActionRun>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final runs = snapshot.data ?? [];
          final filtered = runs.where((r) => _filter == 'all' ? true : r.status == _filter).toList();
          return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _future = _load();
              });
              await _future;
            },
            child: ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Wrap(
                    spacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('Todos'),
                        selected: _filter == 'all',
                        onSelected: (_) => setState(() => _filter = 'all'),
                      ),
                      ChoiceChip(
                        label: const Text('running'),
                        selected: _filter == 'running',
                        onSelected: (_) => setState(() => _filter = 'running'),
                      ),
                      ChoiceChip(
                        label: const Text('succeeded'),
                        selected: _filter == 'succeeded',
                        onSelected: (_) => setState(() => _filter = 'succeeded'),
                      ),
                      ChoiceChip(
                        label: const Text('failed'),
                        selected: _filter == 'failed',
                        onSelected: (_) => setState(() => _filter = 'failed'),
                      ),
                      ChoiceChip(
                        label: const Text('timeout'),
                        selected: _filter == 'timeout',
                        onSelected: (_) => setState(() => _filter = 'timeout'),
                      ),
                    ],
                  ),
                ),
                ...filtered.map(
                  (run) => Card(
                    child: ListTile(
                      title: Text('#${run.id} • ${run.status}'),
                      subtitle: Text(run.outputText ?? run.errorText ?? 'Sin salida'),
                      trailing: Text(run.createdAt?.toLocal().toString().substring(0, 16) ?? '-'),
                    ),
                  ),
                ),
                if (filtered.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(20),
                    child: Center(child: Text('No hay runs para el filtro seleccionado.')),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
