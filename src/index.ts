
        const td = body.trigger_data ?? body;
        await dispatch('queue_message', td, env);
        msg.ack();
      } catch {
        msg.retry();
      }
    }
  },
};
