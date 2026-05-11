import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../shared/app_snackbar.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  final _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    final current = ref.read(appSettingsProvider).apiBaseUrl;
    _controller.text = current;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final value = _controller.text.trim();
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      AppSnackbar.error(context, 'La URL debe iniciar con http:// o https://');
      return;
    }
    await ref.read(appSettingsProvider.notifier).setApiBaseUrl(value);
    if (!mounted) return;
    AppSnackbar.success(context, 'API base actualizada');
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Configuracion')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('API Base URL', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(labelText: 'Ej: http://127.0.0.1:8001/api/v1'),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: _save, child: const Text('Guardar y volver')),
          const SizedBox(height: 8),
          const Text('Despues de guardar, vuelve a iniciar sesion si ya habia sesiones abiertas.'),
        ],
      ),
    );
  }
}
