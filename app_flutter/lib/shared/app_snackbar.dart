import 'package:flutter/material.dart';

class AppSnackbar {
  static void success(BuildContext context, String message) {
    _show(context, message, background: const Color(0xFF0F766E));
  }

  static void error(BuildContext context, String message) {
    _show(context, message, background: const Color(0xFFB91C1C));
  }

  static void info(BuildContext context, String message) {
    _show(context, message, background: const Color(0xFF1D4ED8));
  }

  static void _show(BuildContext context, String message, {required Color background}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: background,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
