import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LicenseService {
  static const String _supabaseUrl = 'https://dgnmaczzfxtslgfiosqr.supabase.co';
  static const String _publishableKey = 'sb_publishable_KX1cxfefdCZpDoE_lLk7pQ_Yes3NU2t';
  static const String _activatedKey = 'license_activated_v1';
  static const String _installationIdKey = 'license_installation_id_v1';

  static final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: 15000,
      receiveTimeout: 15000,
      headers: {
        'apikey': _publishableKey,
        'Authorization': 'Bearer $_publishableKey',
        'Content-Type': 'application/json',
      },
    ),
  );

  static Future<bool> isActivated() async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getBool(_activatedKey) ?? false;
  }

  static Future<void> activate(String code) async {
    final preferences = await SharedPreferences.getInstance();
    var installationId = preferences.getString(_installationIdKey);
    if (installationId == null) {
      installationId = _createInstallationId();
      await preferences.setString(_installationIdKey, installationId);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '$_supabaseUrl/functions/v1/redeem-license',
        data: {
          'code': code,
          'installation_id': installationId,
        },
      );
      final status = response.data?['status'];
      if (status == 'activated' || status == 'already_activated') {
        await preferences.setBool(_activatedKey, true);
        return;
      }
      if (status == 'used') {
        throw const ActivationException(
          'Este código ya fue activado en otro dispositivo. Contacta al administrador para recuperarlo.',
        );
      }
      throw const ActivationException('El código no es válido. Revísalo e inténtalo nuevamente.');
    } on DioError catch (error) {
      final responseData = error.response?.data;
      final status = responseData is Map ? responseData['status'] : null;
      if (status == 'used') {
        throw const ActivationException(
          'Este código ya fue activado en otro dispositivo. Contacta al administrador para recuperarlo.',
        );
      }
      if (status == 'invalid') {
        throw const ActivationException('El código no es válido. Revísalo e inténtalo nuevamente.');
      }
      throw const ActivationException(
        'No se pudo conectar con el servidor de activación. Comprueba tu conexión e inténtalo nuevamente.',
      );
    }
  }

  static String _createInstallationId() {
    final bytes = List<int>.generate(32, (_) => Random.secure().nextInt(256));
    return base64UrlEncode(bytes).replaceAll('=', '');
  }
}

class ActivationException implements Exception {
  final String message;

  const ActivationException(this.message);

  @override
  String toString() => message;
}
