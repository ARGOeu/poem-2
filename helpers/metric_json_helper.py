import json
import argparse
import os


def main():
    parser = argparse.ArgumentParser(
        "Convert old metric format to new for all the files in the given "
        "directory; newly created files will have suffix '-new'"
    )
    parser.add_argument(
        "-d", "--directory", dest="directory", required=True, type=str,
        help="directory with the dumped json files"
    )
    args = parser.parse_args()

    files = [
        os.path.join(args.directory, f) for f in os.listdir(args.directory) if
        os.path.isfile(os.path.join(args.directory, f))
    ]

    for file in files:
        with open(file, "r") as f:
            data = json.load(f)

        changed = False
        new_data = [item for item in data if item["model"] != "poem.metrictype"]
        for item in new_data:
            if item["model"] == "poem.metric":
                if item["fields"]["probekey"]:
                    item["fields"]["probeversion"] = \
                        f"{item['fields']['probekey'][0]} " \
                        f"({item['fields']['probekey'][1]})"

                else:
                    item["fields"]["probeversion"] = None

                item["fields"].pop("mtype")
                item["fields"].pop("probekey")
                item["fields"].pop("description")
                item["fields"].pop("parent")
                item["fields"].pop("probeexecutable")
                item["fields"].pop("attribute")
                item["fields"].pop("dependancy")
                item["fields"].pop("flags")
                item["fields"].pop("files")
                item["fields"].pop("parameter")
                item["fields"].pop("fileparameter")

                changed = True

        if changed:
            extension = file.split(".")[-1]
            new_name = file.split(f".{extension}")[0] + f"-new.{extension}"

            with open(new_name, "w") as f:
                json.dump(new_data, f, indent=4)


main()
