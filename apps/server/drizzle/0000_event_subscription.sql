-- Custom SQL migration file, put your code below! --
CREATE
OR REPLACE FUNCTION notify_new_agent_version() RETURNS trigger AS Trigger BEGIN -- Notify about the change.
-- Notify when new agent specification versions are inserted, including version details
PERFORM pg_notify(
    'new_agent_version',
    json_build_object(
        'id',
        NEW.id,
        'agent_id',
        NEW.agent_id,
        'prompt',
        NEW.prompt,
        'specification',
        NEW.specification,
        'created_at',
        NEW.created_at
    ) :: text
);

RETURN NEW;

END;

Trigger LANGUAGE plpgsql;

CREATE TRIGGER notify_new_agent_version
AFTER
INSERT
    ON agent_specification_version FOR EACH ROW EXECUTE FUNCTION notify_new_agent_version();