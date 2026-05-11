import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/login_page.dart';
import '../features/devices/devices_page.dart';
import '../features/devices/device_detail_page.dart';
import '../features/actions/global_runs_page.dart';
import '../features/settings/settings_page.dart';
import '../core/providers.dart';
import '../core/app_config.dart';
import '../features/devices/device_models.dart';

final routerNotifierProvider = ChangeNotifierProvider<RouterNotifier>((ref) {
  return RouterNotifier(ref);
});

class RouterNotifier extends ChangeNotifier {
  RouterNotifier(this._ref) {
    _ref.listen(authControllerProvider, (_, __) {
      notifyListeners();
    });
  }

  final Ref _ref;

  String? redirect(BuildContext context, GoRouterState state) {
    final authState = _ref.read(authControllerProvider);
    if (!authState.initialized) {
      return null;
    }
    final isAuth = authState.authenticated;
    final isLogin = state.matchedLocation == '/login';
    if (!isAuth && !isLogin) {
      return '/login';
    }
    if (isAuth && isLogin) {
      return '/';
    }
    return null;
  }
}

final goRouterProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);
  return GoRouter(
    initialLocation: '/login',
    redirect: notifier.redirect,
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const DevicesPage(),
        routes: [
          GoRoute(
            path: 'device/:id',
            builder: (context, state) {
              final device = state.extra as Device?;
              if (device == null) {
                return const Scaffold(body: Center(child: Text('Device not found')));
              }
              return DeviceDetailPage(
                device: device,
                wsBaseUrl: AppConfig.wsFromApi(
                  ref.read(appSettingsProvider).apiBaseUrl,
                ),
              );
            },
          ),
          GoRoute(
            path: 'runs',
            builder: (context, state) {
              final devices = state.extra as List<Device>? ?? [];
              return GlobalRunsPage(devices: devices);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsPage(),
      ),
    ],
  );
});
