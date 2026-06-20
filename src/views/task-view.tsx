import { Badge, Button, Card, Icon, Step, StepTimeline } from "@/components/index";

export function TaskView({ onStop }: { onStop: () => void }) {
    const [steps, setSteps] = useState<Step[]>([
        { label: "Reading job listings", status: "done", detail: "found 12 matches" },
        {
            label: (
                <span>
                    Clicking <b>Apply</b> · Software Engineer at Acme
                </span>
            ),
            status: "running",
        },
        { label: "Filling application form", status: "pending" },
        { label: "Review before submit", status: "pending" },
    ]);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        const t = setTimeout(() => {
            setSteps(prev => {
                const i = prev.findIndex(s => s.status === "running");
                if (i < 0 || i >= prev.length - 1) return prev;
                const next = prev.map(s => ({ ...s }));
                next[i].status = "done";
                next[i + 1].status = "running";
                return next;
            });
        }, 2200);
        return () => clearTimeout(t);
    }, [steps, paused]);

    const done = steps.filter(s => s.status === "done").length;
    return (
        <div className="flex-1 min-h-0 flex flex-col pt-4 px-4 pb-5 overflow-y-auto navi-scroll">
            <Card
                agent
                className="mb-[14px]">
                <div className="flex items-center gap-[10px]">
                    <span className="w-[30px] h-[30px] flex-none rounded-sm bg-[rgba(var(--beacon-rgb),0.14)] text-accent-text flex items-center justify-center">
                        <Icon
                            name="workflow"
                            size={15}
                        />
                    </span>
                    <div>
                        <div className="text-md font-semibold text-strong">Applying to matching jobs</div>
                        <div className="text-xs text-muted mt-[2px] font-mono">
                            {done} of {steps.length} steps · acme + 11 more
                        </div>
                    </div>
                    <Badge
                        tone="progress"
                        dot>
                        {paused ? "Paused" : "Running"}
                    </Badge>
                </div>
            </Card>

            <div className="flex items-center gap-[6px] text-sm text-muted mb-4">
                <Icon
                    name="eye"
                    size={13}
                />{" "}
                Looking at: <b className="text-body">“Apply” button</b> on the listing card
            </div>

            <StepTimeline steps={steps} />

            <div className="flex gap-2 mt-[14px] pt-[14px] border-t border-line">
                {paused ? (
                    <Button
                        variant="primary"
                        size="sm"
                        icon="play"
                        onClick={() => setPaused(false)}>
                        Resume
                    </Button>
                ) : (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="pause"
                        onClick={() => setPaused(true)}>
                        Pause
                    </Button>
                )}
                <Button
                    variant="danger"
                    size="sm"
                    icon="square"
                    onClick={onStop}>
                    Stop
                </Button>
            </div>
        </div>
    );
}
