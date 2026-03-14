.PHONY: web backend

web:
	cd web && pnpm run dev

backend:
	cd backend && source venv/bin/activate && python main.py