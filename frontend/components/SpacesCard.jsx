import React from "react";

const SpacesCard = (props) => {
  const {
    spaceImage,
    spaceTitle,
    spaceDescription,
    spaceStatusColor,
    daily,
    monthly,
    yearly,
  } = props;
  return (
    <div className="bg-[#F7F7F7] rounded-lg w-full flex flex-col gap-2 border-[1px] border-[#efefef]">
      {/* image section */}
      <div className="bg-yellow-400 flex flex-col rounded-t-lg overflow-hidden">
        <div
          className="h-[100px] "
          style={{
            backgroundImage: `url(${spaceImage})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="bg-white pl-3 pt-2 pb-3 border-b-[1px] border-gray-300">
          <h3 className="font-semibold text-[12px]">{spaceTitle}</h3>
          <div className="flex items-center gap-1">
            <img src={spaceStatusColor} alt="green circle" width={10} />

            <p className="text-[10px] text-gray-500 font-semibold">
              {spaceDescription}
            </p>
          </div>
        </div>
      </div>

      {/* subscription types section */}
      <div className="flex justify-center pb-2">
        {/* daily */}
        <div className="border-r-[1px] border-gray-300 pr-4">
          <p className="font-bold text-[11px]">{daily}</p>
          <p className="text-[10px] text-gray-600">Daily</p>
        </div>

        {/* monthly */}
        <div className="border-r-[1px] border-gray-300 px-4">
          <p className="font-bold text-[11px]">{monthly}</p>
          <p className="text-[10px] text-gray-600">Monthly</p>
        </div>

        {/* yearly */}
        <div className="pl-4">
          <p className="font-bold text-[11px]">{yearly}</p>
          <p className="text-[10px] text-gray-500">Yearly</p>
        </div>
      </div>
    </div>
  );
};

export default SpacesCard;
