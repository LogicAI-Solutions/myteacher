import logging
import traceback
import sys
import os
import time
from datetime import date

class LockedDailyHandler(logging.Handler):
    """
    Handler customizado que rotaciona os logs diariamente e utiliza um arquivo .lock
    para garantir segurança ao ser escrito simultaneamente por múltiplos processos (ex: workers do Uvicorn),
    conforme solicitado para evitar perda de dados.
    """
    def __init__(self, log_dir: str):
        super().__init__()
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)

    def emit(self, record):
        try:
            msg = self.format(record)
            # Determina o sufixo baseado no dia atual
            today = date.today().isoformat()
            log_filename = os.path.join(self.log_dir, f"app_{today}.log")
            lock_filename = os.path.join(self.log_dir, f"app_{today}.lock")

            # Spinlock simple: Tenta criar o .lock exclusivamente
            while True:
                try:
                    fd = os.open(lock_filename, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                    break
                except FileExistsError:
                    time.sleep(0.01)
                    
            # Tendo adquirido o lock, escreve o conteudo no arquivo
            try:
                with open(log_filename, "a", encoding="utf-8") as f:
                    f.write(msg + "\n")
            finally:
                os.close(fd)
                try:
                    os.remove(lock_filename)
                except OSError:
                    pass
        except Exception:
            self.handleError(record)


def setup_logger():
    # Pega o logger root para interceptar tudo
    root_logger = logging.getLogger()
    
    # Logger específico do nosso app
    app_logger = logging.getLogger("backend")
    app_logger.setLevel(logging.DEBUG)
    
    # Evitar adicionar os mesmos handlers
    if app_logger.handlers:
        return app_logger

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    log_dir = os.path.join(base_dir, "logs")

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(module)s.%(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(formatter)

    # Rotação diária com .lock
    fh = LockedDailyHandler(log_dir)
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(formatter)

    # Adiciona handlers ao nosso app_logger
    app_logger.addHandler(ch)
    app_logger.addHandler(fh)

    # OPCIONAL: Interceptar outros loggers importantes para centralizar tudo no mesmo arquivo .log
    for name in ["uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"]:
        l = logging.getLogger(name)
        # Remove handlers padrão para não duplicar no console
        l.handlers = []
        l.propagate = False
        l.addHandler(ch)
        l.addHandler(fh)

    return app_logger

logger = setup_logger()

def log_error_with_traceback(msg: str, exc: Exception):
    """ Atalho prático para garantir os detalhes de erro + traceback no formato certo"""
    logger.error(f"{msg}: {str(exc)}", exc_info=True)
