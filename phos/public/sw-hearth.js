    if (alert.level >= PAIN_THRESHOLD) {
      self.registration.showNotification('⚠ Pain Alert', {
        body: `Pain level ${alert.level} detected. Spoon capacity reduced.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'pain-alert',
        requireInteraction: true,
        data: alert,
      });
    }
        );
      });
    } catch { /* */ }
  }
});

    });
  } catch { /* */ }
});

          client.focus();
          return;
        }
      }
